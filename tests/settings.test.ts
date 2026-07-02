import { beforeEach, test, expect } from 'vitest'
import { getClientId, getClipMs, getDeviceId, getMode, setClientId, setClipMs, setDeviceId, setMode } from '../src/state/settings'

beforeEach(() => localStorage.clear())

test('Default ist start', () => {
  expect(getMode()).toBe('start')
})

test('setMode persistiert', () => {
  setMode('random')
  expect(getMode()).toBe('random')
})

test('ungültiger gespeicherter Wert -> Default', () => {
  localStorage.setItem('phonogramm.mode', 'müll')
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
  localStorage.setItem('phonogramm.clipMs', '7000')
  expect(getClipMs()).toBe(10000)
})

test('getClipMs: nicht-numerischer gespeicherter Wert -> Default 10000', () => {
  localStorage.setItem('phonogramm.clipMs', 'abc')
  expect(getClipMs()).toBe(10000)
})

test('getDeviceId: Default ist leerer String', () => {
  expect(getDeviceId()).toBe('')
})

test('setDeviceId persistiert', () => {
  setDeviceId('dev2')
  expect(getDeviceId()).toBe('dev2')
})

test('setDeviceId mit leerem Wert entfernt gespeicherten Wert', () => {
  setDeviceId('dev2')
  setDeviceId('')
  expect(getDeviceId()).toBe('')
})
