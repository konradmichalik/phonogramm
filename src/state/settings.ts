import { CLIP_MS, type Mode } from '../types'

const KEY = 'phonogramm.mode'
const CLIENT_ID_KEY = 'phonogramm.clientId'
const CLIP_MS_KEY = 'phonogramm.clipMs'
const DEVICE_ID_KEY = 'phonogramm.deviceId'

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

export function getDeviceId(): string {
  return localStorage.getItem(DEVICE_ID_KEY) ?? ''
}

export function setDeviceId(id: string): void {
  if (id === '') {
    localStorage.removeItem(DEVICE_ID_KEY)
    return
  }
  localStorage.setItem(DEVICE_ID_KEY, id)
}
