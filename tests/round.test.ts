import { startRound } from '../src/quiz/round'
import type { Folge, Track } from '../src/types'

const folgen: Folge[] = [{ nummer: 5, titel: 'X', albumId: 'alb' }]
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
  expect(round.positionMs).toBe(0)
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
