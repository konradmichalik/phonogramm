import { startRound } from '../src/quiz/round'
import type { Folge, Track } from '../src/types'

const folgen: Folge[] = [{ nummer: 5, titel: 'X', albumId: 'alb', introEndMs: 10000 }]
const tracks: Track[] = [{ uri: 't0', durationMs: 60000 }]

test('startRound liefert Folge + Clip + play', async () => {
  let played = false
  const round = await startRound({
    folgen,
    defaultIntroEndMs: 35000,
    mode: 'start',
    token: 'TOK',
    getAlbumTracks: async () => tracks,
    playClip: async () => { played = true },
    rng: () => 0,
  })
  expect(round.folge.nummer).toBe(5)
  expect(round.clip.trackUri).toBe('t0')
  await round.play()
  expect(played).toBe(true)
})

test('startRound caches tracks by albumId', async () => {
  let callCount = 0
  const cachedTracks: Track[] = [{ uri: 'cached-t0', durationMs: 60000 }]
  const cacheTestFolgen: Folge[] = [
    { nummer: 10, titel: 'Cache Test', albumId: 'cache-test-alb', introEndMs: 10000 },
  ]

  const startRoundWithCache = async () =>
    startRound({
      folgen: cacheTestFolgen,
      defaultIntroEndMs: 35000,
      mode: 'start',
      token: 'TOK',
      getAlbumTracks: async () => {
        callCount++
        return cachedTracks
      },
      playClip: async () => {},
      rng: () => 0,
    })

  // First call should fetch tracks
  const round1 = await startRoundWithCache()
  expect(callCount).toBe(1)

  // Second call with same albumId should use cache
  const round2 = await startRoundWithCache()
  expect(callCount).toBe(1) // Still 1 — cache hit
  expect(round2.clip.trackUri).toBe('cached-t0')
})
