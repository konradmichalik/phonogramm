const toBase64Url = (bytes: Uint8Array): string => {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateCodeVerifier(
  randomBytes: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string {
  return toBase64Url(randomBytes(48))
}

export async function codeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toBase64Url(new Uint8Array(digest))
}

export async function buildAuthUrl(
  cfg: { clientId: string; redirectUri: string; scopes: string[] },
  verifier: string,
): Promise<string> {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    redirect_uri: cfg.redirectUri,
    code_challenge_method: 'S256',
    code_challenge: await codeChallenge(verifier),
    scope: cfg.scopes.join(' '),
  })
  return `https://accounts.spotify.com/authorize?${params.toString()}`
}
