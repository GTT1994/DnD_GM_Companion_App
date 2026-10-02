// Tests for the NPC, name and loot generators.

import { describe, expect, it } from 'vitest'
import type { MagicItem } from '../data/srd'
import { ancestries } from '../data/npcTables'
import { generateLoot, generateNames, generateNpc } from './generators'

const item = (name: string, rarity: string): MagicItem =>
  ({ index: name, name, rarity, category: 'Wondrous Items', attunement: false, desc: '' })

describe('generateNpc', () => {
  it('uses names from the chosen species and gender', () => {
    const npc = generateNpc('Dwarf', Math.random, { gender: 'Female', occupation: 'innkeeper' })
    const [first, last] = npc.name.split(' ')
    expect(npc).toMatchObject({ ancestry: 'Dwarf', gender: 'Female', occupation: 'innkeeper' })
    expect(ancestries.Dwarf.female).toContain(first)
    expect(ancestries.Dwarf.last).toContain(last)
  })
})

describe('generateNames', () => {
  it('gives different names, all of the chosen gender', () => {
    const names = generateNames('Elf', 'Male', 10)
    expect(names).toHaveLength(10)
    expect(new Set(names.map((n) => n.name)).size).toBe(10)
    expect(names.every((n) => n.gender === 'Male' && ancestries.Elf.male.includes(n.name.split(' ')[0]))).toBe(true)
  })

  it('mixes species and genders when not chosen', () => {
    const names = generateNames(undefined, undefined, 30)
    expect(new Set(names.map((n) => n.species)).size).toBeGreaterThan(3)
    expect(new Set(names.map((n) => n.gender))).toEqual(new Set(['Female', 'Male']))
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
