export function parseAlbumName(name: string): { nummer: number; titel: string } | null

export function detectSkipLeadingTracks(
  tracks: Array<{ name: string; track_number: number; disc_number?: number }>,
): number

export function pickArtist(
  items: Array<{ id: string; name: string; followers?: { total?: number } }> | undefined,
): { id: string; name: string; followers: number } | null
