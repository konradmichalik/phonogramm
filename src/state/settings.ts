import type { Mode } from '../types'

const KEY = 'hq.mode'
const CLIENT_ID_KEY = 'hq.clientId'

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
