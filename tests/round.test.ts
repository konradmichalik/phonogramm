import { startRound } from '../src/quiz/round'
import type { Folge, Track } from '../src/types'

const folgen: Folge[] = [{ nummer: 5, titel: 'X', albumId: 'alb', startSeconds: 42 }]
const tracks: Track[] = [{ uri: 't0', durationMs: 60000 }]

test('startRound liefert Folge + Tracks + positionMs', async () => {
  const round = await startRound({
    folgen,
    mode: 'start',
    token: 'TOK',
    getAlbumTracks: async () => tracks,
    rng: () => 0,
  })
  expect(round.folge.nummer).toBe(5)
  expect(round.tracks).toEqual(tracks)
  expect(round.positionMs).toBe(42000) // startSeconds: 42 -> Start bei 42s
})

test('startRound caches tracks by albumId', async () => {
  let callCount = 0
  const cachedTracks: Track[] = [{ uri: 'cached-t0', durationMs: 60000 }]
  const cacheTestFolgen: Folge[] = [{ nummer: 10, titel: 'Cache Test', albumId: 'cache-test-alb' }]

  const startRoundWithCache = async () =>
    startRound({
      folgen: cacheTestFolgen,
      mode: 'start',
      token: 'TOK',
      getAlbumTracks: async () => {
        callCount++
        return cachedTracks
      },
      rng: () => 0,
    })

  // First call should fetch tracks
  await startRoundWithCache()
  expect(callCount).toBe(1)

  // Second call with same albumId should use cache
  const round2 = await startRoundWithCache()
  expect(callCount).toBe(1) // Still 1 — cache hit
  expect(round2.tracks).toEqual(cachedTracks)
})

test('startRound versucht die nächste Folge, wenn eine fehlschlägt', async () => {
  const resilientFolgen: Folge[] = [
    { nummer: 1, titel: 'Fails', albumId: 'resilience-a' },
    { nummer: 2, titel: 'Works', albumId: 'resilience-b' },
  ]
  const workingTracks: Track[] = [{ uri: 'ok-t0', durationMs: 60000 }]

  const round = await startRound({
    folgen: resilientFolgen,
    mode: 'start',
    token: 'TOK',
    getAlbumTracks: async (albumId) => {
      if (albumId === 'resilience-a') throw new Error('Album-Tracks laden fehlgeschlagen (404)')
      return workingTracks
    },
    rng: () => 0, // would pick 'resilience-a' first without resilience
  })

  expect(round.folge.albumId).toBe('resilience-b')
  expect(round.tracks).toEqual(workingTracks)
})

test('startRound wirft, wenn alle Folgen fehlschlagen, mit dem letzten Fehlertext', async () => {
  const allFailFolgen: Folge[] = [
    { nummer: 1, titel: 'A', albumId: 'all-fail-a' },
    { nummer: 2, titel: 'B', albumId: 'all-fail-b' },
  ]

  await expect(
    startRound({
      folgen: allFailFolgen,
      mode: 'start',
      token: 'TOK',
      getAlbumTracks: async (albumId) => {
        throw new Error(`Album-Tracks laden fehlgeschlagen (404) für ${albumId}`)
      },
      rng: () => 0,
    }),
  ).rejects.toThrow(/\(404\)/)
})

test('startRound überspringt Album mit leerer Tracklist und versucht die nächste Folge', async () => {
  const emptyTracksFolgen: Folge[] = [
    { nummer: 1, titel: 'Empty', albumId: 'empty-tracks-a' },
    { nummer: 2, titel: 'Works', albumId: 'empty-tracks-b' },
  ]
  const workingTracks: Track[] = [{ uri: 'ok-t0', durationMs: 60000 }]

  const round = await startRound({
    folgen: emptyTracksFolgen,
    mode: 'start',
    token: 'TOK',
    getAlbumTracks: async (albumId) => {
      if (albumId === 'empty-tracks-a') return [] // Empty tracklist
      return workingTracks
    },
    rng: () => 0, // would pick 'empty-tracks-a' first without resilience
  })

  expect(round.folge.albumId).toBe('empty-tracks-b')
  expect(round.tracks).toEqual(workingTracks)
})

test('startRound entfernt skipLeadingTracks führende Tracks (Spoiler-Inhaltsangabe)', async () => {
  const skipFolgen: Folge[] = [{ nummer: 239, titel: 'Spoiler', albumId: 'skip-alb', startSeconds: 49, skipLeadingTracks: 1 }]
  const t0: Track = { uri: 'synopsis-t0', durationMs: 30000 }
  const t1: Track = { uri: 't1', durationMs: 60000 }
  const t2: Track = { uri: 't2', durationMs: 60000 }

  const round = await startRound({
    folgen: skipFolgen,
    mode: 'start',
    token: 'TOK',
    getAlbumTracks: async () => [t0, t1, t2],
    rng: () => 0,
  })

  expect(round.tracks).toEqual([t1, t2])
  expect(round.positionMs).toBe(49000) // startSeconds: 49, über sliced Trackset berechnet
})

test('startRound lässt Tracks unverändert, wenn skipLeadingTracks fehlt', async () => {
  const noSkipFolgen: Folge[] = [{ nummer: 1, titel: 'Kein Skip', albumId: 'no-skip-alb' }]
  const tracks: Track[] = [{ uri: 't0', durationMs: 60000 }, { uri: 't1', durationMs: 60000 }]

  const round = await startRound({
    folgen: noSkipFolgen,
    mode: 'start',
    token: 'TOK',
    getAlbumTracks: async () => tracks,
    rng: () => 0,
  })

  expect(round.tracks).toEqual(tracks)
})

test('startRound (Modus start): nutzt startSeconds aus der Folge als Startposition', async () => {
  const folgenMitStart: Folge[] = [{ nummer: 42, titel: 'Mit Startzeit', albumId: 'start-alb', startSeconds: 42 }]
  const longTrack: Track[] = [{ uri: 'long-t0', durationMs: 300000 }]

  const round = await startRound({
    folgen: folgenMitStart,
    mode: 'start',
    token: 'TOK',
    getAlbumTracks: async () => longTrack,
    rng: () => 0,
  })

  expect(round.positionMs).toBe(42000)
})

test('startRound (Modus start): fällt auf 0 zurück, wenn startSeconds fehlt', async () => {
  const folgenOhneStart: Folge[] = [{ nummer: 300, titel: 'Ohne Startzeit', albumId: 'no-start-alb' }]
  const longTrack: Track[] = [{ uri: 'long-t0', durationMs: 300000 }]

  const round = await startRound({
    folgen: folgenOhneStart,
    mode: 'start',
    token: 'TOK',
    getAlbumTracks: async () => longTrack,
    rng: () => 0,
  })

  expect(round.positionMs).toBe(0)
})

test('startRound behandelt skipLeadingTracks >= Trackanzahl als Ladefehler und versucht die nächste Folge', async () => {
  const allSkippedFolgen: Folge[] = [
    { nummer: 1, titel: 'Ganz geskippt', albumId: 'all-skipped-a', skipLeadingTracks: 5 },
    { nummer: 2, titel: 'Works', albumId: 'all-skipped-b' },
  ]
  const skippedTracks: Track[] = [{ uri: 'skip-t0', durationMs: 30000 }]
  const workingTracks: Track[] = [{ uri: 'ok-t0', durationMs: 60000 }]

  const round = await startRound({
    folgen: allSkippedFolgen,
    mode: 'start',
    token: 'TOK',
    getAlbumTracks: async (albumId) => {
      if (albumId === 'all-skipped-a') return skippedTracks
      return workingTracks
    },
    rng: () => 0, // would pick 'all-skipped-a' first without resilience
  })

  expect(round.folge.albumId).toBe('all-skipped-b')
  expect(round.tracks).toEqual(workingTracks)
})
