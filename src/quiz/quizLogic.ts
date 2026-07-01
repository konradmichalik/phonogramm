import type { Folge } from '../types'

export function pickRandomFolge(
  folgen: Folge[],
  rng: () => number = Math.random,
  excludeAlbumIds?: string[],
): Folge {
  const candidates =
    excludeAlbumIds && excludeAlbumIds.length > 0
      ? folgen.filter((folge) => !excludeAlbumIds.includes(folge.albumId))
      : folgen
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
