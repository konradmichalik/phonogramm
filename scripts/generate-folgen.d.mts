export function parseAlbumName(name: string): { nummer: number; titel: string } | null

export function detectSkipLeadingTracks(
  tracks: Array<{ name: string; track_number: number; disc_number?: number }>,
): number
