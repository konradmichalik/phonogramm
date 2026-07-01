import { buildAuthUrl, generateCodeVerifier } from './pkce'

export interface AuthConfig { clientId: string; redirectUri: string; scopes: string[] }

const T_KEY = 'hq.token'
const E_KEY = 'hq.expires'
const V_KEY = 'hq.verifier'

export const SPOTIFY_CONFIG: AuthConfig = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? '',
  redirectUri: `${location.origin}${import.meta.env.BASE_URL}`,
  scopes: ['user-read-playback-state', 'user-modify-playback-state'],
}

export function getAccessToken(): string | null {
  const token = sessionStorage.getItem(T_KEY)
  const expires = Number(sessionStorage.getItem(E_KEY) ?? 0)
  if (!token || !Number.isFinite(expires) || Date.now() >= expires) return null
  return token
}

export async function beginLogin(cfg: AuthConfig): Promise<void> {
  if (!cfg.clientId) {
    throw new Error('Spotify Client ID fehlt — bitte VITE_SPOTIFY_CLIENT_ID in .env setzen.')
  }
  const verifier = generateCodeVerifier()
  sessionStorage.setItem(V_KEY, verifier)
  location.assign(await buildAuthUrl(cfg, verifier))
}

export async function exchangeCodeForToken(code: string, cfg: AuthConfig): Promise<void> {
  const verifier = sessionStorage.getItem(V_KEY) ?? ''
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    code_verifier: verifier,
  })
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error('Token-Austausch fehlgeschlagen')
  const data = (await res.json()) as { access_token: string; expires_in: number }
  sessionStorage.setItem(T_KEY, data.access_token)
  sessionStorage.setItem(E_KEY, String(Date.now() + data.expires_in * 1000))
  sessionStorage.removeItem(V_KEY)
}
