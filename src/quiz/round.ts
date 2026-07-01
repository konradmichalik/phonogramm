import type { Folge, Mode, Track } from '../types'
import { pickRandomFolge } from './quizLogic'
import { initialPosition } from './timeline'

export interface StartRoundDeps {
  folgen: Folge[]
  mode: Mode
  token: string
  getAlbumTracks: (albumId: string, token: string) => Promise<Track[]>
  excludeAlbumIds?: string[]
  rng?: () => number
}

export interface Round {
  folge: Folge
  tracks: Track[]
  positionMs: number
}

const trackCache = new Map<string, Track[]>()

async function loadTracks(deps: StartRoundDeps, albumId: string): Promise<Track[]> {
  const cached = trackCache.get(albumId)
  if (cached !== undefined) {
    if (cached.length === 0) throw new Error(`Keine Tracks für Album ${albumId}`)
    return cached
  }
  const tracks = await deps.getAlbumTracks(albumId, deps.token)
  if (tracks.length === 0) throw new Error(`Keine Tracks für Album ${albumId}`)
  trackCache.set(albumId, tracks)
  return tracks
}

export async function startRound(deps: StartRoundDeps): Promise<Round> {
  const failed = new Set(deps.excludeAlbumIds ?? [])
  let lastError: unknown = null

  for (let attempt = 0; attempt < deps.folgen.length; attempt++) {
    const folge = pickRandomFolge(deps.folgen, deps.rng, [...failed])
    try {
      const tracks = await loadTracks(deps, folge.albumId)
      const positionMs = initialPosition({ mode: deps.mode, tracks, rng: deps.rng })
      return { folge, tracks, positionMs }
    } catch (error) {
      lastError = error
      failed.add(folge.albumId)
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError)
  throw new Error(`Keine Folge konnte geladen werden: ${detail}`)
}
