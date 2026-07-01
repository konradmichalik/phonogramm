import { totalDurationMs, initialPosition, scrub, positionToClip } from '../src/quiz/timeline'
import type { Track } from '../src/types'

const A: Track[] = [
  { uri: 't0', durationMs: 60000 },
  { uri: 't1', durationMs: 120000 },
  { uri: 't2', durationMs: 90000 },
  { uri: 't3', durationMs: 60000 },
]

test('totalDurationMs summiert alle Track-Dauern', () => {
  expect(totalDurationMs(A)).toBe(330000)
})

test('initialPosition start: immer 0', () => {
  expect(initialPosition({ mode: 'start', tracks: A })).toBe(0)
})

test('initialPosition random: untere Grenze bei rng=0', () => {
  expect(initialPosition({ mode: 'random', tracks: A, rng: () => 0 })).toBe(60000)
})

test('initialPosition random: obere Grenze bei rng=0.999', () => {
  const pos = initialPosition({ mode: 'random', tracks: A, rng: () => 0.999 })
  expect(pos).toBeGreaterThanOrEqual(60000)
  expect(pos).toBeLessThanOrEqual(265000)
})

test('initialPosition random: Fallback auf 0 bei < 3 Tracks', () => {
  expect(initialPosition({ mode: 'random', tracks: [A[0], A[1]], rng: () => 0 })).toBe(0)
})

test('scrub: klemmt am unteren Rand', () => {
  expect(scrub(0, -5000, A)).toBe(0)
})

test('scrub: bewegt vorwärts', () => {
  expect(scrub(0, 5000, A)).toBe(5000)
})

test('scrub: bewegt rückwärts', () => {
  expect(scrub(10000, -5000, A)).toBe(5000)
})

test('scrub: klemmt am oberen Rand (total - CLIP_MS)', () => {
  expect(scrub(325000, 10000, A)).toBe(325000)
})

test('positionToClip: Start des ersten Tracks', () => {
  expect(positionToClip(A, 0)).toEqual({ trackUri: 't0', positionMs: 0 })
})

test('positionToClip: Start des zweiten Tracks', () => {
  expect(positionToClip(A, 60000)).toEqual({ trackUri: 't1', positionMs: 0 })
})

test('positionToClip: mitten im zweiten Track', () => {
  expect(positionToClip(A, 65000)).toEqual({ trackUri: 't1', positionMs: 5000 })
})

test('positionToClip: mitten im dritten Track', () => {
  expect(positionToClip(A, 190000)).toEqual({ trackUri: 't2', positionMs: 10000 })
})
