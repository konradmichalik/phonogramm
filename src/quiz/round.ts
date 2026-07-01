import type { ClipPosition, Folge, Mode, Track } from '../types'
import { computeClip } from './computeClip'
import { pickRandomFolge } from './quizLogic'

export interface StartRoundDeps {
  folgen: Folge[]
  defaultIntroEndMs: number
  mode: Mode
  token: string
  getAlbumTracks: (albumId: string, token: string) => Promise<Track[]>
  playClip: (token: string, clip: ClipPosition) => Promise<void>
  rng?: () => number
}

export interface Round {
  folge: Folge
  clip: ClipPosition
  play: () => Promise<void>
}

const trackCache = new Map<string, Track[]>()

export async function startRound(deps: StartRoundDeps): Promise<Round> {
  const folge = pickRandomFolge(deps.folgen, deps.rng)
  let tracks = trackCache.get(folge.albumId)
  if (!tracks) {
    tracks = await deps.getAlbumTracks(folge.albumId, deps.token)
    trackCache.set(folge.albumId, tracks)
  }
  const clip = computeClip({
    mode: deps.mode,
    folge,
    tracks,
    defaultIntroEndMs: deps.defaultIntroEndMs,
    rng: deps.rng,
  })
  return { folge, clip, play: () => deps.playClip(deps.token, clip) }
}
