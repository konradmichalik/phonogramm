import type { Folge } from '../types'

export function pickRandomFolge(folgen: Folge[], rng: () => number = Math.random): Folge {
  const index = Math.floor(rng() * folgen.length)
  return folgen[Math.min(index, folgen.length - 1)]
}

export function evaluateAnswer(guess: number, folge: Folge): { correct: boolean; message: string } {
  const correct = guess === folge.nummer
  const message = correct
    ? `Richtig!\nFolge ${folge.nummer} – ${folge.titel}`
    : `Leider nicht richtig. Versuch es beim nächsten Mal!\nGesucht war Folge ${folge.nummer} – ${folge.titel}.`
  return { correct, message }
}
