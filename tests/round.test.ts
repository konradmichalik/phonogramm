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
