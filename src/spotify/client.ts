import type { Track } from '../types'

const API = 'https://api.spotify.com/v1'

export class NoActiveDeviceError extends Error {
  constructor() {
    super('Kein aktives Spotify-Gerät gefunden.')
  }
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

export async function getAlbumTracks(albumId: string, token: string): Promise<Track[]> {
  const res = await fetch(`${API}/albums/${albumId}/tracks?limit=50`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`Album-Tracks laden fehlgeschlagen (${res.status})`)
  const data = (await res.json()) as { items: Array<{ uri: string; duration_ms: number }> }
  return data.items.map((t) => ({ uri: t.uri, durationMs: t.duration_ms }))
}

export async function getActiveDeviceId(token: string): Promise<string | null> {
  const res = await fetch(`${API}/me/player/devices`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`Geräte laden fehlgeschlagen (${res.status})`)
  const data = (await res.json()) as { devices: Array<{ id: string; is_active: boolean }> }
  const active = data.devices.find((d) => d.is_active) ?? data.devices[0]
  return active?.id ?? null
}

export async function playClipRequest(
  token: string,
  opts: { deviceId: string; uris: string[]; positionMs: number },
): Promise<void> {
  const res = await fetch(`${API}/me/player/play?device_id=${opts.deviceId}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris: opts.uris, position_ms: opts.positionMs }),
  })
  if (!res.ok) throw new Error(`Wiedergabe fehlgeschlagen (${res.status})`)
}

export async function pausePlayback(token: string, deviceId: string): Promise<void> {
  await fetch(`${API}/me/player/pause?device_id=${deviceId}`, {
    method: 'PUT',
    headers: authHeaders(token),
  })
}
