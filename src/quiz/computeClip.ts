import { CLIP_MS, type ClipPosition, type Folge, type Mode, type Track } from '../types'

interface ComputeClipArgs {
  mode: Mode
  folge: Folge
  tracks: Track[]
  defaultIntroEndMs: number
  rng?: () => number
}

const clampPosition = (positionMs: number, durationMs: number): number =>
  Math.max(0, Math.min(positionMs, Math.max(0, durationMs - CLIP_MS)))

export function computeClip({ mode, folge, tracks, defaultIntroEndMs, rng = Math.random }: ComputeClipArgs): ClipPosition {
  if (mode === 'start') {
    const track = tracks[0]
    const intro = folge.introEndMs ?? defaultIntroEndMs
    return { trackUri: track.uri, positionMs: clampPosition(intro, track.durationMs) }
  }

  const hasMiddle = tracks.length >= 3
  const startIdx = hasMiddle ? 1 : 0
  const endIdx = hasMiddle ? tracks.length - 2 : 0
  const span = endIdx - startIdx + 1
  const trackIdx = startIdx + Math.min(Math.floor(rng() * span), span - 1)
  const track = tracks[trackIdx]
  const maxPos = Math.max(0, track.durationMs - CLIP_MS)
  const positionMs = clampPosition(Math.floor(rng() * maxPos), track.durationMs)
  return { trackUri: track.uri, positionMs }
}
