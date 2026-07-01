import { beforeEach, test, expect } from 'vitest'
import { getMode, setMode } from '../src/state/settings'

beforeEach(() => {
  const store: Record<string, string> = {}
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key])
    },
    length: 0,
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    },
  } as Storage

  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })

  localStorage.clear()
})

test('Default ist start', () => {
  expect(getMode()).toBe('start')
})

test('setMode persistiert', () => {
  setMode('random')
  expect(getMode()).toBe('random')
})

test('ungültiger gespeicherter Wert -> Default', () => {
  localStorage.setItem('hq.mode', 'müll')
  expect(getMode()).toBe('start')
})
