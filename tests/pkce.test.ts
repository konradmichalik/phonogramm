import { generateCodeVerifier, codeChallenge, buildAuthUrl } from '../src/auth/pkce'

test('verifier ist base64url, 43-128 Zeichen', () => {
  const v = generateCodeVerifier()
  expect(v).toMatch(/^[A-Za-z0-9\-_]{43,128}$/)
})

test('challenge ist deterministisch für gleichen verifier', async () => {
  const a = await codeChallenge('teststring-teststring-teststring-teststring')
  const b = await codeChallenge('teststring-teststring-teststring-teststring')
  expect(a).toBe(b)
  expect(a).toMatch(/^[A-Za-z0-9\-_]+$/)
})

test('buildAuthUrl enthält Pflichtparameter', async () => {
  const url = await buildAuthUrl(
    { clientId: 'CID', redirectUri: 'https://ex.org/cb', scopes: ['a', 'b'] },
    'teststring-teststring-teststring-teststring',
  )
  const u = new URL(url)
  expect(u.origin + u.pathname).toBe('https://accounts.spotify.com/authorize')
  expect(u.searchParams.get('client_id')).toBe('CID')
  expect(u.searchParams.get('code_challenge_method')).toBe('S256')
  expect(u.searchParams.get('response_type')).toBe('code')
  expect(u.searchParams.get('scope')).toBe('a b')
})
