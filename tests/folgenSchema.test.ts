import { describe, it, expect } from 'vitest'
import { parseFolgenData } from '../src/data/folgenSchema'

describe('folgenSchema', () => {
  it('akzeptiert gültige Folgendaten', () => {
    const data = parseFolgenData({
      folgen: [{ nummer: 125, titel: 'Feuermond', albumId: 'abc' }],
    })
    expect(data.folgen[0].nummer).toBe(125)
  })

  it('lehnt Folge ohne albumId ab', () => {
    expect(() =>
      parseFolgenData({
        folgen: [{ nummer: 1, titel: 'X' }],
      }),
    ).toThrow()
  })

  it('lehnt nummer < 1 ab', () => {
    expect(() =>
      parseFolgenData({
        folgen: [{ nummer: 0, titel: 'X', albumId: 'a' }],
      }),
    ).toThrow()
  })

  it('akzeptiert eine Folge mit startSeconds', () => {
    const data = parseFolgenData({
      folgen: [{ nummer: 1, titel: 'Super-Papagei', albumId: 'abc', startSeconds: 42 }],
    })
    expect(data.folgen[0].startSeconds).toBe(42)
  })

  it('lehnt negatives startSeconds ab', () => {
    expect(() =>
      parseFolgenData({
        folgen: [{ nummer: 1, titel: 'X', albumId: 'a', startSeconds: -1 }],
      }),
    ).toThrow()
  })

  it('akzeptiert eine Folge mit skipLeadingTracks', () => {
    const data = parseFolgenData({
      folgen: [{ nummer: 239, titel: 'Spoiler-Folge', albumId: 'abc', skipLeadingTracks: 1 }],
    })
    expect(data.folgen[0].skipLeadingTracks).toBe(1)
  })

  it('lehnt negatives skipLeadingTracks ab', () => {
    expect(() =>
      parseFolgenData({
        folgen: [{ nummer: 1, titel: 'X', albumId: 'a', skipLeadingTracks: -1 }],
      }),
    ).toThrow()
  })
})
