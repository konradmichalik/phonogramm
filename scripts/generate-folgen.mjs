#!/usr/bin/env node
// Generates src/data/folgen.json from the Spotify ARTIST album catalog of
// "Die drei ???". Lists every album by the artist, parses the episode
// number/title from each album name, and auto-detects a leading synopsis
// track to skip. Uses artist/album endpoints only (no playlist reads, which
// can return 403 for third-party playlists).
//
// Usage: SPOTIFY_TOKEN=<token> node scripts/generate-folgen.mjs
//        Optional: SPOTIFY_ARTIST_ID=<id> to override artist resolution.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ARTIST_NAME = 'Die drei ???'
const SYNOPSIS_PATTERN = /inhaltsangabe|zusammenfassung/i
const SERIES_PREFIX_PATTERN = /^die\s+drei\s+(\?{3}|fragezeichen)\s*/i
const LEADING_LABEL_PATTERN = /^(folge|fall)\s*/i

/**
 * Parses an album name into an episode number and title.
 * Returns null when no episode number can be confidently extracted.
 * @param {string} name
 * @returns {{ nummer: number, titel: string } | null}
 */
export function parseAlbumName(name) {
  if (typeof name !== 'string') return null

  let rest = name.trim()
  rest = rest.replace(SERIES_PREFIX_PATTERN, '')
  rest = rest.replace(LEADING_LABEL_PATTERN, '')

  const match = rest.match(/^(\d{1,3})\s*[:\-–/]\s*(.+)$/)
  if (!match) return null

  const nummer = parseInt(match[1], 10)
  const titel = match[2].trim()
  if (!Number.isInteger(nummer) || nummer < 1 || nummer > 999) return null
  if (titel.length === 0) return null

  return { nummer, titel }
}

/**
 * Detects the number of consecutive leading tracks whose name matches a
 * synopsis pattern (e.g. "Inhaltsangabe"), which would spoil the episode's
 * number/title if left in the playable clip range.
 * @param {Array<{ name: string, track_number: number, disc_number?: number }>} tracks
 * @returns {number}
 */
export function detectSkipLeadingTracks(tracks) {
  const sorted = [...tracks].sort((a, b) => {
    const discA = a.disc_number || 1
    const discB = b.disc_number || 1
    if (discA !== discB) return discA - discB
    return a.track_number - b.track_number
  })

  let count = 0
  for (const track of sorted) {
    if (SYNOPSIS_PATTERN.test(track.name)) {
      count += 1
    } else {
      break
    }
  }
  return count
}

/**
 * Picks the best-matching artist from a Spotify search result's
 * `artists.items` array. Prefers an exact (case-insensitive) name match to
 * "Die drei ???"; among exact matches, picks the one with the highest
 * follower count. Returns null when the list is empty.
 * @param {Array<{ id: string, name: string, followers?: { total?: number } }>} items
 * @returns {{ id: string, name: string, followers: number } | null}
 */
export function pickArtist(items) {
  if (!Array.isArray(items) || items.length === 0) return null

  const normalized = items.map((item) => ({
    id: item.id,
    name: item.name,
    followers: item.followers?.total ?? 0,
  }))

  const exactMatches = normalized.filter(
    (item) => item.name.trim().toLowerCase() === ARTIST_NAME.toLowerCase(),
  )

  const candidates = exactMatches.length > 0 ? exactMatches : normalized
  candidates.sort((a, b) => b.followers - a.followers)
  return candidates[0]
}

async function spotifyFetch(url, token) {
  for (;;) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.status === 401) {
      console.error(
        'Spotify-Token abgelaufen oder ungültig (401). Bitte neuen Token besorgen (siehe README).',
      )
      process.exit(1)
    }

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After') ?? '1')
      console.log(`Rate-Limit erreicht, warte ${retryAfter}s…`)
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
      continue
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(
        `Spotify API Fehler: HTTP ${response.status}\nURL: ${url}\nAntwort: ${body || '(kein Body)'}`,
      )
    }

    return response.json()
  }
}

async function resolveArtistId(token) {
  if (process.env.SPOTIFY_ARTIST_ID) {
    return { id: process.env.SPOTIFY_ARTIST_ID, name: '(aus SPOTIFY_ARTIST_ID)', followers: null }
  }

  const url = `https://api.spotify.com/v1/search?type=artist&limit=10&q=${encodeURIComponent(ARTIST_NAME)}`
  const data = await spotifyFetch(url, token)
  const artist = pickArtist(data.artists?.items ?? [])

  if (!artist) {
    throw new Error(
      `Kein Spotify-Künstler für "${ARTIST_NAME}" gefunden. ` +
        'Bitte SPOTIFY_ARTIST_ID als Umgebungsvariable setzen, um die Künstlersuche zu überspringen.',
    )
  }

  return artist
}

async function fetchAllAlbumRefs(artistId, token) {
  const refs = new Map()
  let url =
    `https://api.spotify.com/v1/artists/${artistId}/albums` +
    `?include_groups=album&limit=50&market=DE`

  while (url) {
    const data = await spotifyFetch(url, token)
    for (const album of data.items ?? []) {
      if (album?.id) refs.set(album.id, { id: album.id, name: album.name })
    }
    url = data.next
  }

  return [...refs.values()]
}

async function fetchAlbumsWithTracks(albumRefs, token) {
  const albums = new Map()
  const batchSize = 20

  for (let i = 0; i < albumRefs.length; i += batchSize) {
    const batch = albumRefs.slice(i, i + batchSize)
    const ids = batch.map((ref) => ref.id).join(',')
    const url = `https://api.spotify.com/v1/albums?ids=${ids}&market=DE`
    const data = await spotifyFetch(url, token)

    for (const album of data.albums ?? []) {
      if (!album?.id) continue
      albums.set(album.id, {
        albumId: album.id,
        name: album.name,
        tracks: album.tracks?.items ?? [],
        totalTracks: album.total_tracks ?? album.tracks?.items?.length ?? 0,
      })
    }

    console.log(`Alben-Details geladen: ${Math.min(i + batchSize, albumRefs.length)}/${albumRefs.length}`)
  }

  return albums
}

function buildFolgen(albums) {
  const unparsed = []
  const byNummer = new Map()
  const collisions = []

  for (const album of albums.values()) {
    const parsed = parseAlbumName(album.name)
    if (!parsed) {
      unparsed.push(album.name)
      continue
    }

    const skipLeadingTracks = detectSkipLeadingTracks(album.tracks)
    const entry = {
      nummer: parsed.nummer,
      titel: parsed.titel,
      albumId: album.albumId,
      ...(skipLeadingTracks > 0 ? { skipLeadingTracks } : {}),
      _trackCount: album.totalTracks ?? album.tracks.length,
    }

    const existing = byNummer.get(parsed.nummer)
    if (!existing) {
      byNummer.set(parsed.nummer, entry)
      continue
    }

    collisions.push({
      nummer: parsed.nummer,
      kept: existing._trackCount >= entry._trackCount ? existing.albumId : entry.albumId,
      dropped: existing._trackCount >= entry._trackCount ? entry.albumId : existing.albumId,
    })

    if (entry._trackCount > existing._trackCount) {
      byNummer.set(parsed.nummer, entry)
    }
  }

  return { byNummer, unparsed, collisions }
}

function validateEntries(byNummer) {
  const valid = []
  const invalid = []

  for (const entry of byNummer.values()) {
    const { _trackCount, ...rest } = entry
    const isValid =
      Number.isInteger(rest.nummer) &&
      rest.nummer >= 1 &&
      rest.nummer <= 999 &&
      typeof rest.titel === 'string' &&
      rest.titel.length > 0 &&
      typeof rest.albumId === 'string' &&
      rest.albumId.length > 0

    if (isValid) {
      valid.push(rest)
    } else {
      invalid.push(rest)
    }
  }

  valid.sort((a, b) => a.nummer - b.nummer)
  return { valid, invalid }
}

async function main() {
  const token = process.env.SPOTIFY_TOKEN
  if (!token) {
    console.error(
      'Kein SPOTIFY_TOKEN gesetzt.\n\n' +
        'So bekommst du einen Token:\n' +
        '  1. In der App einloggen (Spotify-Login-Flow durchlaufen).\n' +
        '  2. DevTools-Konsole öffnen und ausführen: sessionStorage.getItem(\'hq.token\')\n' +
        '  3. Den Wert kopieren und als SPOTIFY_TOKEN Umgebungsvariable übergeben:\n\n' +
        '     SPOTIFY_TOKEN=<token> node scripts/generate-folgen.mjs\n',
    )
    process.exit(1)
  }

  const artist = await resolveArtistId(token)
  console.log(
    `Künstler: ${artist.name} (id=${artist.id}${
      artist.followers !== null ? `, followers=${artist.followers}` : ''
    })`,
  )

  console.log('Lade Alben-Liste des Künstlers…')
  const albumRefs = await fetchAllAlbumRefs(artist.id, token)
  console.log(`${albumRefs.length} Alben gefunden.`)

  console.log('Lade Alben-Details (inkl. erster Tracks) in Batches…')
  const albums = await fetchAlbumsWithTracks(albumRefs, token)

  const { byNummer, unparsed, collisions } = buildFolgen(albums)
  const { valid, invalid } = validateEntries(byNummer)

  const outputPath = path.resolve(process.cwd(), 'src/data/folgen.json')
  writeFileSync(outputPath, JSON.stringify({ folgen: valid }, null, 2) + '\n', 'utf-8')

  const withSkip = valid.filter((f) => (f.skipLeadingTracks ?? 0) > 0).length

  console.log('\n--- Zusammenfassung ---')
  console.log(`Künstler: ${artist.name} (id=${artist.id})`)
  console.log(`Alben insgesamt gesehen: ${albums.size}`)
  console.log(`Folgen geschrieben: ${valid.length}`)
  console.log(`Davon mit skipLeadingTracks > 0: ${withSkip}`)

  if (invalid.length > 0) {
    console.log(`\nUngültige Einträge verworfen (${invalid.length}):`)
    for (const entry of invalid) {
      console.log(`  - ${JSON.stringify(entry)}`)
    }
  }

  if (collisions.length > 0) {
    console.log(`\nNummern-Kollisionen (${collisions.length}):`)
    for (const collision of collisions) {
      console.log(
        `  - Folge ${collision.nummer}: behalten albumId=${collision.kept}, verworfen albumId=${collision.dropped}`,
      )
    }
  }

  if (unparsed.length > 0) {
    console.log(`\nNicht zuordenbare Album-Namen (${unparsed.length}), bitte manuell ergänzen:`)
    for (const name of unparsed) {
      console.log(`  - ${name}`)
    }
  }

  console.log(`\n${outputPath} geschrieben.`)
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url)
if (isMainModule) {
  main().catch((error) => {
    console.error('Fehler:', error.message)
    process.exit(1)
  })
}
