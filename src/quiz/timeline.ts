import { CLIP_MS, type ClipPosition, type Mode, type Track } from '../types'

interface InitialPositionArgs {
  mode: Mode
  tracks: Track[]
  rng?: () => number
}

const clamp = (value: number, lower: number, upper: number): number => Math.max(lower, Math.min(value, upper))

export function totalDurationMs(tracks: Track[]): number {
  return tracks.reduce((sum, track) => sum + track.durationMs, 0)
}

export function initialPosition({ mode, tracks, rng = Math.random }: InitialPositionArgs): number {
  if (mode === 'start') {
    return 0
  }

  const total = totalDurationMs(tracks)
  const lastTrackDurationMs = tracks[tracks.length - 1]?.durationMs ?? 0
  const hasMiddleBand = tracks.length >= 3
  const middleLower = tracks[0]?.durationMs ?? 0
  const middleUpper = total - lastTrackDurationMs - CLIP_MS

  const useMiddleBand = hasMiddleBand && middleUpper > middleLower
  const lower = useMiddleBand ? middleLower : 0
  const upper = useMiddleBand ? middleUpper : Math.max(0, total - CLIP_MS)

  const positionMs = Math.floor(lower + rng() * (upper - lower))
  return clamp(positionMs, lower, upper)
}

export function scrub(positionMs: number, stepMs: number, tracks: Track[]): number {
  const maxPosition = Math.max(0, totalDurationMs(tracks) - CLIP_MS)
  return clamp(positionMs + stepMs, 0, maxPosition)
}

export function positionToClip(tracks: Track[], positionMs: number): ClipPosition {
  if (tracks.length === 0) {
    return { trackUri: '', positionMs: 0 }
  }

  const total = totalDurationMs(tracks)
  if (positionMs >= total) {
    const lastTrack = tracks[tracks.length - 1]
    return { trackUri: lastTrack.uri, positionMs: Math.max(0, lastTrack.durationMs - CLIP_MS) }
  }

  let cumulativeStart = 0
  for (const track of tracks) {
    const trackEnd = cumulativeStart + track.durationMs
    if (positionMs < trackEnd) {
      return { trackUri: track.uri, positionMs: positionMs - cumulativeStart }
    }
    cumulativeStart = trackEnd
  }

  const lastTrack = tracks[tracks.length - 1]
  return { trackUri: lastTrack.uri, positionMs: Math.max(0, lastTrack.durationMs - CLIP_MS) }
}
