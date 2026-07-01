import { getAccessToken, exchangeCodeForToken, beginLogin, getSpotifyConfig } from '../src/auth/spotifyAuth'

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  vi.restoreAllMocks()
})

test('getAccessToken: null ohne Token', () => {
  expect(getAccessToken()).toBeNull()
})

test('exchangeCodeForToken speichert Token', async () => {
  sessionStorage.setItem('hq.verifier', 'v-teststring-teststring-teststring-xx')
  vi.stubGlobal('fetch', vi.fn(async () => new Response(
    JSON.stringify({ access_token: 'TOK', expires_in: 3600 }),
    { status: 200 },
  )))
  await exchangeCodeForToken('code123', { clientId: 'CID', redirectUri: 'https://ex.org/cb', scopes: [] })
  expect(getAccessToken()).toBe('TOK')
})

test('getAccessToken: null nach Ablauf', () => {
  sessionStorage.setItem('hq.token', 'TOK')
  sessionStorage.setItem('hq.expires', String(Date.now() - 1000))
  expect(getAccessToken()).toBeNull()
})

test('exchangeCodeForToken wirft bei !res.ok', async () => {
  sessionStorage.setItem('hq.verifier', 'v-teststring-teststring-teststring-xx')
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 400 })))
  await expect(
    exchangeCodeForToken('code123', { clientId: 'CID', redirectUri: 'https://ex.org/cb', scopes: [] }),
  ).rejects.toThrow('Token-Austausch fehlgeschlagen')
})

test('beginLogin wirft bei leerer clientId und ruft location.assign nicht auf', async () => {
  const assignSpy = vi.fn()
  const originalLocation = window.location
  Object.defineProperty(window, 'location', { value: { ...originalLocation, assign: assignSpy }, configurable: true })
  try {
    await expect(
      beginLogin({ clientId: '', redirectUri: 'https://ex.org/cb', scopes: [] }),
    ).rejects.toThrow('Keine Spotify Client ID hinterlegt')
    expect(assignSpy).not.toHaveBeenCalled()
  } finally {
    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true })
  }
})

test('getSpotifyConfig: liefert Client ID aus localStorage bevorzugt vor env', () => {
  localStorage.setItem('hq.clientId', 'from-localstorage')
  expect(getSpotifyConfig().clientId).toBe('from-localstorage')
})
