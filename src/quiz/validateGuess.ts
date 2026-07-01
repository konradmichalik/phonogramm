const GUESS_RE = /^[1-9][0-9]{0,2}$/

export type GuessResult =
  | { valid: true; value: number }
  | { valid: false; error: string }

export function validateGuess(raw: string): GuessResult {
  const trimmed = raw.trim()
  if (!GUESS_RE.test(trimmed)) {
    return { valid: false, error: 'Bitte gib eine ganze Zahl von 1 bis 999 ein.' }
  }
  return { valid: true, value: Number(trimmed) }
}
