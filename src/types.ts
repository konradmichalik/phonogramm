export type Mode = 'start' | 'random'

export interface Folge {
  nummer: number
  titel: string
  albumId: string
  startSeconds?: number
  skipLeadingTracks?: number
}

export interface FolgenData {
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

export const CLIP_MS = 10000
