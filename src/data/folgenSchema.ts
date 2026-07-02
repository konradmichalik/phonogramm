import { z } from 'zod'
import type { FolgenData } from '../types'

const folgeSchema = z.object({
  nummer: z.number().int().min(1).max(999),
  titel: z.string().min(1),
  albumId: z.string().min(1),
  startSeconds: z.number().int().min(0).optional(),
  skipLeadingTracks: z.number().int().min(0).optional(),
})

const folgenDataSchema = z.object({
  folgen: z.array(folgeSchema).min(1),
})

export function parseFolgenData(input: unknown): FolgenData {
  return folgenDataSchema.parse(input)
}
