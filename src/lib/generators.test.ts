// Tests for the NPC and loot generators.

import { describe, expect, it } from 'vitest'
import type { MagicItem } from '../data/srd'
import { ancestries } from '../data/npcTables'
import { generateLoot, generateNpc } from './generators'

const item = (name: string, rarity: string): MagicItem =>
  ({ index: name, name, rarity, category: 'Wondrous Items', attunement: false, desc: '' })

describe('generateNpc', () => {
  it('uses names from the chosen ancestry', () => {
    const npc = generateNpc('Dwarf')
    const [first, last] = npc.name.split(' ')
    expect(npc.ancestry).toBe('Dwarf')
    expect(ancestries.Dwarf.first).toContain(first)
    expect(ancestries.Dwarf.last).toContain(last)
  })
})

describe('generateLoot', () => {
  it('gives only gold for individual treasure', () => {
    const loot = generateLoot(1, 'individual', [], () => 0)
    expect(loot).toMatchObject({ gold: 3, gems: [], items: [] })  // 3d6 all rolling 1
  })

  it('multiplies hoard gold and adds gems and items', () => {
    const items = [item('Potion of Healing', 'Common'), item('Bag of Holding', 'Uncommon')]
    const loot = generateLoot(1, 'hoard', items, () => 0)
    expect(loot.gold).toBe(200)  // 2d4 all rolling 1, × 100
    expect(loot.gems).toHaveLength(1)
    expect(loot.items.map((i) => i.name)).toEqual(['Potion of Healing'])
  })

  it('moves up a rarity when none of the picked rarity exist', () => {
    const loot = generateLoot(1, 'hoard', [item('Bag of Holding', 'Uncommon')], () => 0)
    expect(loot.items[0].name).toBe('Bag of Holding')
  })
})
