import { CLIP_MS, type Mode } from '../types'

const KEY = 'hq.mode'
const CLIENT_ID_KEY = 'hq.clientId'
const CLIP_MS_KEY = 'hq.clipMs'

export const CLIP_PRESETS_MS = [5000, 10000, 15000, 20000]

export function getMode(): Mode {
  const value = localStorage.getItem(KEY)
  return value === 'random' || value === 'start' ? value : 'start'
}

export function setMode(mode: Mode): void {
  localStorage.setItem(KEY, mode)
}

export function getClientId(): string {
  return localStorage.getItem(CLIENT_ID_KEY)?.trim() ?? ''
}

export function setClientId(id: string): void {
  const trimmed = id.trim()
  if (trimmed === '') {
    localStorage.removeItem(CLIENT_ID_KEY)
    return
  }
  localStorage.setItem(CLIENT_ID_KEY, trimmed)
}

export function getClipMs(): number {
  const value = Number(localStorage.getItem(CLIP_MS_KEY))
  return CLIP_PRESETS_MS.includes(value) ? value : CLIP_MS
}

export function setClipMs(ms: number): void {
  localStorage.setItem(CLIP_MS_KEY, String(ms))
}
