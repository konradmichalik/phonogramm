import { validateGuess } from '../src/quiz/validateGuess'

test('akzeptiert 1-3 Ziffern >= 1', () => {
  expect(validateGuess('1')).toEqual({ valid: true, value: 1 })
  expect(validateGuess('125')).toEqual({ valid: true, value: 125 })
})

test.each(['0', '007', '-5', '12.5', '1a', '', 'abc', '1234'])('lehnt ungültige Eingabe "%s" ab', (input) => {
  const r = validateGuess(input)
  expect(r.valid).toBe(false)
})

test('liefert verständliche Fehlermeldung', () => {
  const r = validateGuess('abc')
  expect(r.valid).toBe(false)
  if (!r.valid) expect(r.error).toMatch(/Zahl/i)
})
