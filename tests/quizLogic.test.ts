import { pickRandomFolge, evaluateAnswer } from '../src/quiz/quizLogic'
import type { Folge } from '../src/types'

const folgen: Folge[] = [
  { nummer: 1, titel: 'A', albumId: 'a' },
  { nummer: 2, titel: 'B', albumId: 'b' },
]

test('pickRandomFolge wählt anhand rng', () => {
  expect(pickRandomFolge(folgen, () => 0).nummer).toBe(1)
  expect(pickRandomFolge(folgen, () => 0.99).nummer).toBe(2)
})

test('pickRandomFolge klemmt Index bei rng() === 1', () => {
  expect(pickRandomFolge(folgen, () => 1).nummer).toBe(2)
})

test('pickRandomFolge schließt excludeAlbumIds aus', () => {
  const result = pickRandomFolge(folgen, () => 0, ['a'])
  expect(result.albumId).not.toBe('a')
  expect(result.nummer).toBe(2)
})

test('pickRandomFolge schließt mehrere excludeAlbumIds aus', () => {
  const threeFolgen: Folge[] = [
    { nummer: 1, titel: 'A', albumId: 'a' },
    { nummer: 2, titel: 'B', albumId: 'b' },
    { nummer: 3, titel: 'C', albumId: 'c' },
  ]
  const result = pickRandomFolge(threeFolgen, () => 0, ['a', 'b'])
  expect(result.albumId).toBe('c')
})

test('pickRandomFolge fällt auf volle Liste zurück, wenn alle Folgen ausgeschlossen sind', () => {
  const result = pickRandomFolge(folgen, () => 0, ['a', 'b'])
  expect(folgen.map((f) => f.albumId)).toContain(result.albumId)
})

test('pickRandomFolge fällt auf volle Liste zurück, wenn nur eine Folge übrig bleibt', () => {
  const singleFolge: Folge[] = [{ nummer: 1, titel: 'A', albumId: 'a' }]
  const result = pickRandomFolge(singleFolge, () => 0, ['a'])
  expect(result.nummer).toBe(1)
})

test('evaluateAnswer korrekt', () => {
  const r = evaluateAnswer(125, { nummer: 125, titel: 'Feuermond', albumId: 'x' })
  expect(r.correct).toBe(true)
  expect(r.message).toBe('Richtig!\nFolge 125 – Feuermond')
})

test('evaluateAnswer falsch', () => {
  const r = evaluateAnswer(1, { nummer: 125, titel: 'Feuermond', albumId: 'x' })
  expect(r.correct).toBe(false)
  expect(r.message).toBe('Leider nicht richtig. Versuch es beim nächsten Mal!\nGesucht war Folge 125 – Feuermond.')
})
