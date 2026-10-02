// Checks on the imported SRD data, so a future `npm run srd` can't quietly bring back known problems.

import { describe, expect, it } from 'vitest'
import { loadSrd } from './srd'

describe('2024 magic items', () => {
  it('have their tables as proper tables (not cells run together)', async () => {
    const items = await loadSrd('2024', 'magic-items')
    const glued = items.filter((i) => /\dd\d+[A-Z][a-z]/.test(i.desc) || /[a-z]\d{2}[-–]\d{2}[A-Z]/.test(i.desc))
    expect(glued.map((i) => i.name)).toEqual([])
    const withTables = ['bag-of-beans', 'wand-of-wonder', 'ring-of-resistance', 'staff-of-the-magi', 'horn-of-valhalla-2', 'spell-scroll', 'potions-of-healing']
    for (const index of withTables) {
      expect(items.find((i) => i.index === index)?.desc, index).toMatch(/\n\|.*\|/)
    }
  })

  it('use plain rarities, with extras like +1 kept separately, and no combined entries', async () => {
    const items = await loadSrd('2024', 'magic-items')
    expect(new Set(items.map((i) => i.rarity))).toEqual(new Set(['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Varies']))
    expect(items.find((i) => i.index === 'ammunition-1')).toMatchObject({ rarity: 'Uncommon', rarityNote: '+1' })
    expect(items.some((i) => i.name === 'Armor')).toBe(false)  // the combined "Armor +1, +2 or +3" entry
  })
})
