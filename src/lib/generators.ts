// Random NPC and loot generators. Both take an optional random source so tests are predictable.

import type { MagicItem } from '../data/srd'
import {
  ancestries, appearances, mannerisms, motivations, occupations, personalities, secrets, type Ancestry, type Gender,
} from '../data/npcTables'
import { pick, pickWeighted, roll, type Random } from './dice'

// --- NPCs -----------------------------------------------------------------

export type Npc = {
  id: string
  name: string
  ancestry: Ancestry     // the species
  gender: Gender
  occupation: string
  appearance: string
  personality: string
  mannerism: string
  motivation: string
  secret: string
}

// One random name for a species and gender (random species / gender when left out).
export function randomName(ancestry?: Ancestry, gender?: Gender, random: Random = Math.random) {
  const species = ancestry ?? pick(Object.keys(ancestries) as Ancestry[], random)
  const chosenGender = gender ?? pick<Gender>(['Female', 'Male'], random)
  const names = ancestries[species]
  const first = pick(chosenGender === 'Female' ? names.female : names.male, random)
  return { name: `${first} ${pick(names.last, random)}`, species, gender: chosenGender }
}

// A batch of different names, for the Names tab.
export function generateNames(ancestry?: Ancestry, gender?: Gender, count = 10, random: Random = Math.random) {
  const result: ReturnType<typeof randomName>[] = []
  for (let tries = 0; result.length < count && tries < count * 10; tries++) {
    const next = randomName(ancestry, gender, random)
    if (!result.some((r) => r.name === next.name)) result.push(next)
  }
  return result
}

// Makes a random NPC. Pass a species, gender or occupation to choose them, or leave them out.
export function generateNpc(ancestry?: Ancestry, random: Random = Math.random, options: { gender?: Gender; occupation?: string } = {}): Npc {
  const { name, species, gender } = randomName(ancestry, options.gender, random)
  return {
    id: crypto.randomUUID(),
    name,
    ancestry: species,
    gender,
    occupation: options.occupation ?? pick(occupations, random),
    appearance: pick(appearances, random),
    personality: pick(personalities, random),
    mannerism: pick(mannerisms, random),
    motivation: pick(motivations, random),
    secret: pick(secrets, random),
  }
}

// --- Loot -----------------------------------------------------------------

export type Tier = 1 | 2 | 3 | 4
export type LootKind = 'individual' | 'hoard'

export const tierLabels: Record<Tier, string> = {
  1: 'CR 0–4',
  2: 'CR 5–10',
  3: 'CR 11–16',
  4: 'CR 17+',
}

const rarities = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'] as const
type Rarity = (typeof rarities)[number]

// Simplified treasure tables (not the DMG tables). Coins are dice × multiplier gold pieces.
const tierTables: Record<Tier, {
  individualGold: [string, number]
  hoardGold: [string, number]
  gems: { count: string; values: number[] }
  items: { count: string; rarity: Partial<Record<Rarity, number>> }
}> = {
  1: { individualGold: ['3d6', 1], hoardGold: ['2d4', 100], gems: { count: '1d4', values: [10, 50] }, items: { count: '1d4', rarity: { Common: 50, Uncommon: 45, Rare: 5 } } },
  2: { individualGold: ['2d6', 10], hoardGold: ['6d6', 100], gems: { count: '1d6', values: [50, 100] }, items: { count: '1d6', rarity: { Common: 15, Uncommon: 50, Rare: 30, 'Very Rare': 5 } } },
  3: { individualGold: ['2d6', 100], hoardGold: ['4d6', 1000], gems: { count: '2d6', values: [500, 1000] }, items: { count: '1d6+1', rarity: { Uncommon: 20, Rare: 45, 'Very Rare': 30, Legendary: 5 } } },
  4: { individualGold: ['8d6', 100], hoardGold: ['12d6', 1000], gems: { count: '3d6', values: [1000, 5000] }, items: { count: '1d8+2', rarity: { Rare: 30, 'Very Rare': 45, Legendary: 25 } } },
}

// Gemstones by value in gold pieces.
const gemsByValue: Record<number, string[]> = {
  10: ['azurite', 'blue quartz', 'hematite', 'malachite', 'obsidian', 'turquoise'],
  50: ['bloodstone', 'carnelian', 'chrysoprase', 'moonstone', 'onyx', 'zircon'],
  100: ['amber', 'amethyst', 'coral', 'garnet', 'jade', 'pearl'],
  500: ['alexandrite', 'aquamarine', 'black pearl', 'peridot', 'topaz'],
  1000: ['black opal', 'blue sapphire', 'emerald', 'fire opal', 'star ruby'],
  5000: ['black sapphire', 'diamond', 'jacinth', 'ruby'],
}

export type Loot = {
  id: string
  label: string                                       // e.g. "Hoard, CR 5–10"
  gold: number
  gems: { name: string; value: number; count: number }[]
  items: (Pick<MagicItem, 'index' | 'name' | 'rarity'> & { count: number })[]  // just enough to show and look up the item
}

// Picks a magic item of the given rarity, moving up a rarity if there are none (2024 has few Common items).
function pickItem(items: MagicItem[], rarity: Rarity, random: Random): MagicItem | undefined {
  for (const r of rarities.slice(rarities.indexOf(rarity))) {
    const matches = items.filter((i) => i.rarity === r)
    if (matches.length) return pick(matches, random)
  }
  return undefined
}

// Makes random treasure. Individual treasure is coins only; a hoard adds gems and magic items.
export function generateLoot(tier: Tier, kind: LootKind, magicItems: MagicItem[], random: Random = Math.random): Loot {
  const table = tierTables[tier]
  const [dice, multiplier] = kind === 'individual' ? table.individualGold : table.hoardGold
  const loot: Loot = {
    id: crypto.randomUUID(),
    label: `${kind === 'individual' ? 'Individual' : 'Hoard'}, ${tierLabels[tier]}`,
    gold: roll(dice, random).total * multiplier,
    gems: [],
    items: [],
  }
  if (kind === 'individual') return loot

  // Gems: count them up by name, e.g. "3 × jade (100 gp)".
  const gemCount = roll(table.gems.count, random).total
  for (let i = 0; i < gemCount; i++) {
    const value = pick(table.gems.values, random)
    const name = pick(gemsByValue[value], random)
    const existing = loot.gems.find((g) => g.name === name)
    if (existing) existing.count++
    else loot.gems.push({ name, value, count: 1 })
  }

  const itemCount = roll(table.items.count, random).total
  for (let i = 0; i < itemCount; i++) {
    const item = pickItem(magicItems, pickWeighted(table.items.rarity, random), random)
    if (!item) continue
    const existing = loot.items.find((i) => i.index === item.index)
    if (existing) existing.count++
    else loot.items.push({ index: item.index, name: item.name, rarity: item.rarity, count: 1 })
  }
  return loot
}
