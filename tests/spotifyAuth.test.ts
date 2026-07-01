import { getAccessToken, exchangeCodeForToken } from '../src/auth/spotifyAuth'

beforeEach(() => {
  sessionStorage.clear()
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
