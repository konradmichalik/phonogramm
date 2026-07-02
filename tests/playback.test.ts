import { playClip, playFrom } from '../src/spotify/playback'
import { NoActiveDeviceError } from '../src/spotify/client'

test('spielt und pausiert nach CLIP_MS', async () => {
  const calls: string[] = []
  await playClip('TOK', { trackUri: 't1', positionMs: 1000 }, {
    getActiveDeviceId: async () => 'dev1',
    playClipRequest: async () => { calls.push('play') },
    pausePlayback: async () => { calls.push('pause') },
    wait: async () => { calls.push('wait') },
  })
  expect(calls).toEqual(['play', 'wait', 'pause'])
})

test('wirft NoActiveDeviceError ohne Gerät', async () => {
  await expect(playClip('TOK', { trackUri: 't1', positionMs: 0 }, {
    getActiveDeviceId: async () => null,
  })).rejects.toBeInstanceOf(NoActiveDeviceError)
})

test('playClip gibt preferredDeviceId an getActiveDeviceId weiter', async () => {
  const seen: (string | undefined)[] = []
  await playClip('TOK', { trackUri: 't1', positionMs: 0 }, {
    getActiveDeviceId: async (_token, preferredDeviceId) => {
      seen.push(preferredDeviceId)
      return 'dev1'
    },
    playClipRequest: async () => {},
    pausePlayback: async () => {},
    wait: async () => {},
    preferredDeviceId: 'dev2',
  })
  expect(seen).toEqual(['dev2'])
})

test('playFrom gibt preferredDeviceId an getActiveDeviceId weiter', async () => {
  const seen: (string | undefined)[] = []
  await playFrom('TOK', { trackUri: 't1', positionMs: 0 }, {
    getActiveDeviceId: async (_token, preferredDeviceId) => {
      seen.push(preferredDeviceId)
      return 'dev1'
    },
    playClipRequest: async () => {},
    preferredDeviceId: 'dev2',
  })
  expect(seen).toEqual(['dev2'])
})
