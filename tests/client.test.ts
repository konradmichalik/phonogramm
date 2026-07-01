import { getAlbumTracks, getActiveDeviceId } from '../src/spotify/client'

beforeEach(() => vi.restoreAllMocks())

test('getAlbumTracks mappt uri+durationMs', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    items: [{ uri: 'spotify:track:1', duration_ms: 60000 }],
  }), { status: 200 })))
  const tracks = await getAlbumTracks('album1', 'TOK')
  expect(tracks).toEqual([{ uri: 'spotify:track:1', durationMs: 60000 }])
})

test('getAlbumTracks folgt next-URL über mehrere Seiten', async () => {
  const page1Items = Array.from({ length: 50 }, (_, i) => ({
    uri: `spotify:track:${i + 1}`,
    duration_ms: 60000 + i,
  }))
  const page2Items = [{ uri: 'spotify:track:51', duration_ms: 65000 }]
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ items: page1Items, next: 'https://api.spotify.com/v1/albums/album1/tracks?limit=50&offset=50' }),
        { status: 200 },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ items: page2Items, next: null }), { status: 200 }),
    )
  vi.stubGlobal('fetch', fetchMock)

  const tracks = await getAlbumTracks('album1', 'TOK')

  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(tracks).toEqual(
    [...page1Items, ...page2Items].map((t) => ({ uri: t.uri, durationMs: t.duration_ms })),
  )
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
