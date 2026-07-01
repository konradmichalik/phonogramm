import { beforeEach, test, expect } from 'vitest'
import { getMode, setMode } from '../src/state/settings'

beforeEach(() => localStorage.clear())

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
