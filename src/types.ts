export type Mode = 'start' | 'random'

export interface Folge {
  nummer: number
  titel: string
  albumId: string
  introEndMs?: number
}

export interface FolgenData {
  defaultIntroEndMs: number
  folgen: Folge[]
}

export interface Track {
  uri: string
  durationMs: number
}

export interface ClipPosition {
  trackUri: string
  positionMs: number
}

export const CLIP_MS = 5000
