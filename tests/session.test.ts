import { createSession, recordResult } from '../src/quiz/session'

test('createSession startet bei 0 richtig und 0 falsch', () => {
  expect(createSession()).toEqual({ correct: 0, incorrect: 0 })
})

test('recordResult zählt eine richtige Antwort', () => {
  const session = recordResult(createSession(), true)
  expect(session).toEqual({ correct: 1, incorrect: 0 })
})

test('recordResult zählt eine falsche Antwort', () => {
  const session = recordResult(createSession(), false)
  expect(session).toEqual({ correct: 0, incorrect: 1 })
})

test('recordResult mutiert die übergebene Session nicht', () => {
  const original = createSession()
  recordResult(original, true)
  expect(original).toEqual({ correct: 0, incorrect: 0 })
})

test('recordResult akkumuliert über mehrere Aufrufe', () => {
  let session = createSession()
  session = recordResult(session, true)
  session = recordResult(session, false)
  session = recordResult(session, true)
  expect(session).toEqual({ correct: 2, incorrect: 1 })
})
