import { playClip } from '../src/spotify/playback'
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
