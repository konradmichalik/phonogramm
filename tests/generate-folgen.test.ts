import { describe, it, expect } from 'vitest'
import { parseAlbumName, detectSkipLeadingTracks, pickArtist } from '../scripts/generate-folgen.mjs'

describe('parseAlbumName', () => {
  it('parst "Folge N: Titel"', () => {
    expect(parseAlbumName('Folge 239: Das Geheimnis der sieben Palmen')).toEqual({
      nummer: 239,
      titel: 'Das Geheimnis der sieben Palmen',
    })
  })

  it('parst "N/Titel"', () => {
    expect(parseAlbumName('157/Im Zeichen der Schlangen')).toEqual({
      nummer: 157,
      titel: 'Im Zeichen der Schlangen',
    })
  })

  it('parst "N/Titel" (dreistellig)', () => {
    expect(parseAlbumName('100/Toteninsel')).toEqual({
      nummer: 100,
      titel: 'Toteninsel',
    })
  })

  it('parst mit "Die drei ???"-Präfix', () => {
    expect(parseAlbumName('Die drei ??? Folge 001: Der Superpapagei')).toEqual({
      nummer: 1,
      titel: 'Der Superpapagei',
    })
  })

  it('interpretiert führende Nullen korrekt', () => {
    expect(parseAlbumName('001/Der Superpapagei')).toEqual({
      nummer: 1,
      titel: 'Der Superpapagei',
    })
  })

  it('gibt null für Nicht-Folgen-Namen zurück', () => {
    expect(parseAlbumName('Kosmos Sampler')).toBeNull()
  })
})

describe('detectSkipLeadingTracks', () => {
  it('erkennt eine führende Inhaltsangabe', () => {
    const tracks = [
      { name: 'Inhaltsangabe', track_number: 1 },
      { name: 'Kapitel 1', track_number: 2 },
    ]
    expect(detectSkipLeadingTracks(tracks)).toBe(1)
  })

  it('gibt 0 zurück, wenn keine Inhaltsangabe vorhanden ist', () => {
    const tracks = [
      { name: 'Kapitel 1', track_number: 1 },
      { name: 'Kapitel 2', track_number: 2 },
    ]
    expect(detectSkipLeadingTracks(tracks)).toBe(0)
  })

  it('erkennt zwei führende Synopsis-Tracks', () => {
    const tracks = [
      { name: 'Inhaltsangabe', track_number: 1 },
      { name: 'Zusammenfassung', track_number: 2 },
      { name: 'Kapitel 1', track_number: 3 },
    ]
    expect(detectSkipLeadingTracks(tracks)).toBe(2)
  })

  it('sortiert zuerst nach track_number, auch bei ungeordneter Eingabe', () => {
    const tracks = [
      { name: 'Kapitel 1', track_number: 2 },
      { name: 'Inhaltsangabe', track_number: 1 },
    ]
    expect(detectSkipLeadingTracks(tracks)).toBe(1)
  })
})

describe('pickArtist', () => {
  it('bevorzugt einen exakten Namenstreffer über abweichende Treffer mit mehr Followern', () => {
    const items = [
      { id: 'a1', name: 'Die drei ???', followers: { total: 100 } },
      { id: 'a2', name: 'Die drei ??? Kids', followers: { total: 500000 } },
    ]
    expect(pickArtist(items)).toEqual({ id: 'a1', name: 'Die drei ???', followers: 100 })
  })

  it('ist bei exakten Treffern case-insensitive', () => {
    const items = [{ id: 'a1', name: 'die drei ???', followers: { total: 42 } }]
    expect(pickArtist(items)).toEqual({ id: 'a1', name: 'die drei ???', followers: 42 })
  })

  it('wählt bei mehreren exakten Treffern den mit den meisten Followern', () => {
    const items = [
      { id: 'a1', name: 'Die drei ???', followers: { total: 100 } },
      { id: 'a2', name: 'Die drei ???', followers: { total: 999 } },
    ]
    expect(pickArtist(items)).toEqual({ id: 'a2', name: 'Die drei ???', followers: 999 })
  })

  it('fällt ohne exakten Treffer auf den mit den meisten Followern zurück', () => {
    const items = [
      { id: 'a1', name: 'Die drei Fragezeichen Kids', followers: { total: 10 } },
      { id: 'a2', name: 'Die drei !!!', followers: { total: 20 } },
    ]
    expect(pickArtist(items)).toEqual({ id: 'a2', name: 'Die drei !!!', followers: 20 })
  })

  it('behandelt fehlende followers.total als 0', () => {
    const items = [{ id: 'a1', name: 'Die drei ???' }]
    expect(pickArtist(items)).toEqual({ id: 'a1', name: 'Die drei ???', followers: 0 })
  })

  it('gibt null für eine leere Liste zurück', () => {
    expect(pickArtist([])).toBeNull()
  })

  it('gibt null für nicht-array Eingaben zurück', () => {
    expect(pickArtist(undefined)).toBeNull()
  })
})
