import type { Mode } from '../types'

const KEY = 'hq.mode'

export function getMode(): Mode {
  const value = localStorage.getItem(KEY)
  return value === 'random' || value === 'start' ? value : 'start'
}

export function setMode(mode: Mode): void {
  localStorage.setItem(KEY, mode)
}
