import type { Folge } from '../types'

export function pickRandomFolge(folgen: Folge[], rng: () => number = Math.random, excludeAlbumId?: string): Folge {
  const candidates =
    excludeAlbumId && folgen.length > 1 ? folgen.filter((folge) => folge.albumId !== excludeAlbumId) : folgen
  const pool = candidates.length > 0 ? candidates : folgen
  const index = Math.floor(rng() * pool.length)
  return pool[Math.min(index, pool.length - 1)]
}

export function evaluateAnswer(guess: number, folge: Folge): { correct: boolean; message: string } {
  const correct = guess === folge.nummer
  const message = correct
    ? `Richtig!\nFolge ${folge.nummer} – ${folge.titel}`
    : `Leider nicht richtig. Versuch es beim nächsten Mal!\nGesucht war Folge ${folge.nummer} – ${folge.titel}.`
  return { correct, message }
}
