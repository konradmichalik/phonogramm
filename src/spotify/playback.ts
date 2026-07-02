import { CLIP_MS, type ClipPosition } from '../types'
import {
  NoActiveDeviceError,
  getActiveDeviceId as realGetDevice,
  pausePlayback as realPause,
  playClipRequest as realPlay,
} from './client'

export interface PlaybackDeps {
  getActiveDeviceId: (token: string, preferredDeviceId?: string) => Promise<string | null>
  playClipRequest: (token: string, opts: { deviceId: string; uris: string[]; positionMs: number }) => Promise<void>
  pausePlayback: (token: string, deviceId: string) => Promise<void>
  wait: (ms: number) => Promise<void>
}

const defaultDeps: PlaybackDeps = {
  getActiveDeviceId: realGetDevice,
  playClipRequest: realPlay,
  pausePlayback: realPause,
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
}

export async function playClip(
  token: string,
  clip: ClipPosition,
  deps: Partial<PlaybackDeps> & { clipMs?: number; preferredDeviceId?: string } = {},
): Promise<void> {
  const d = { ...defaultDeps, ...deps }
  const clipMs = deps.clipMs ?? CLIP_MS
  const deviceId = await d.getActiveDeviceId(token, deps.preferredDeviceId)
  if (!deviceId) throw new NoActiveDeviceError()
  await d.playClipRequest(token, { deviceId, uris: [clip.trackUri], positionMs: clip.positionMs })
  await d.wait(clipMs)
  await d.pausePlayback(token, deviceId)
}

// Starts playback at the given position and lets it keep playing (no auto-pause) —
// used for "Weiterhören" after the round is revealed.
export async function playFrom(
  token: string,
  clip: ClipPosition,
  deps: Partial<PlaybackDeps> & { preferredDeviceId?: string } = {},
): Promise<void> {
  const d = { ...defaultDeps, ...deps }
  const deviceId = await d.getActiveDeviceId(token, deps.preferredDeviceId)
  if (!deviceId) throw new NoActiveDeviceError()
  await d.playClipRequest(token, { deviceId, uris: [clip.trackUri], positionMs: clip.positionMs })
}
