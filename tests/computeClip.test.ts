import { computeClip } from '../src/quiz/computeClip'
import type { Track, Folge } from '../src/types'

const folge: Folge = { nummer: 1, titel: 'A', albumId: 'a', introEndMs: 30000 }
const tracks: Track[] = [
  { uri: 't0', durationMs: 120000 },
  { uri: 't1', durationMs: 60000 },
  { uri: 't2', durationMs: 60000 },
  { uri: 't3', durationMs: 60000 },
]

test('start: Track 0 an introEndMs', () => {
  const clip = computeClip({ mode: 'start', folge, tracks, defaultIntroEndMs: 35000 })
  expect(clip).toEqual({ trackUri: 't0', positionMs: 30000 })
})

test('start: nutzt default wenn kein introEndMs', () => {
  const clip = computeClip({ mode: 'start', folge: { ...folge, introEndMs: undefined }, tracks, defaultIntroEndMs: 35000 })
  expect(clip.positionMs).toBe(35000)
})

test('start: klemmt, wenn intro länger als Track', () => {
  const clip = computeClip({ mode: 'start', folge: { ...folge, introEndMs: 200000 }, tracks, defaultIntroEndMs: 35000 })
  expect(clip.positionMs).toBe(120000 - 5000)
})

test('random: wählt mittleren Track, nie ersten/letzten', () => {
  const clip = computeClip({ mode: 'random', folge, tracks, defaultIntroEndMs: 35000, rng: () => 0 })
  expect(clip.trackUri).toBe('t1')
  expect(clip.positionMs).toBe(0)
})

test('random: Position lässt 5s Platz', () => {
  const clip = computeClip({ mode: 'random', folge, tracks, defaultIntroEndMs: 35000, rng: () => 0.999 })
  expect(clip.positionMs).toBeLessThanOrEqual(60000 - 5000)
})

test('random: Fallback auf Track 0 bei < 3 Tracks', () => {
  const clip = computeClip({ mode: 'random', folge, tracks: [tracks[0], tracks[1]], defaultIntroEndMs: 35000, rng: () => 0 })
  expect(clip.trackUri).toBe('t0')
})
