import type { Folge, Mode, Track } from '../types'
import { pickRandomFolge } from './quizLogic'
import { initialPosition } from './timeline'

export interface StartRoundDeps {
  folgen: Folge[]
  mode: Mode
  token: string
  getAlbumTracks: (albumId: string, token: string) => Promise<Track[]>
  excludeAlbumId?: string
  rng?: () => number
}

export interface Round {
  folge: Folge
  tracks: Track[]
  positionMs: number
}

const trackCache = new Map<string, Track[]>()

export async function startRound(deps: StartRoundDeps): Promise<Round> {
  const folge = pickRandomFolge(deps.folgen, deps.rng, deps.excludeAlbumId)
  let tracks = trackCache.get(folge.albumId)
  if (!tracks) {
    tracks = await deps.getAlbumTracks(folge.albumId, deps.token)
    trackCache.set(folge.albumId, tracks)
  }
  const positionMs = initialPosition({ mode: deps.mode, tracks, rng: deps.rng })
  return { folge, tracks, positionMs }
}
