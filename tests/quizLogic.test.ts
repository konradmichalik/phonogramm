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
