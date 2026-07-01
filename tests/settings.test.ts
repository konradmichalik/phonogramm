import { beforeEach, test, expect } from 'vitest'
import { getClientId, getMode, setClientId, setMode } from '../src/state/settings'

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

test('getClientId: Default ist leerer String', () => {
  expect(getClientId()).toBe('')
})

test('setClientId persistiert und trimmt', () => {
  setClientId('  abc123  ')
  expect(getClientId()).toBe('abc123')
})

test('setClientId mit leerem/blank Wert -> getClientId liefert leeren String', () => {
  setClientId('abc123')
  setClientId('   ')
  expect(getClientId()).toBe('')
})
