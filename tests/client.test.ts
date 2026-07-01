import { getAlbumTracks, getActiveDeviceId } from '../src/spotify/client'

beforeEach(() => vi.restoreAllMocks())

test('getAlbumTracks mappt uri+durationMs', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    items: [{ uri: 'spotify:track:1', duration_ms: 60000 }],
  }), { status: 200 })))
  const tracks = await getAlbumTracks('album1', 'TOK')
  expect(tracks).toEqual([{ uri: 'spotify:track:1', durationMs: 60000 }])
})

test('getActiveDeviceId gibt aktives Gerät zurück', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    devices: [{ id: 'dev1', is_active: false }, { id: 'dev2', is_active: true }],
  }), { status: 200 })))
  expect(await getActiveDeviceId('TOK')).toBe('dev2')
})

test('getActiveDeviceId: null ohne Gerät', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ devices: [] }), { status: 200 })))
  expect(await getActiveDeviceId('TOK')).toBeNull()
})
