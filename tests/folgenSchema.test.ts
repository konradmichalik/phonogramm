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
})
