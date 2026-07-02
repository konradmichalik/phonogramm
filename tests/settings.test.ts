import { beforeEach, test, expect } from 'vitest'
import { getClientId, getClipMs, getMode, setClientId, setClipMs, setMode } from '../src/state/settings'

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

test('getClipMs: Default ist 10000', () => {
  expect(getClipMs()).toBe(10000)
})

test('setClipMs persistiert (round-trip)', () => {
  setClipMs(15000)
  expect(getClipMs()).toBe(15000)
})

test('getClipMs: Wert außerhalb der Presets -> Default 10000', () => {
  localStorage.setItem('hq.clipMs', '7000')
  expect(getClipMs()).toBe(10000)
})

test('getClipMs: nicht-numerischer gespeicherter Wert -> Default 10000', () => {
  localStorage.setItem('hq.clipMs', 'abc')
  expect(getClipMs()).toBe(10000)
})
