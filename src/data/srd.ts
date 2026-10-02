// Loads the SRD rules data (monsters, spells, etc.) for each edition, with the GM's homebrew
// monsters and spells mixed in. The JSON files in ./srd are built by scripts/build-srd.mjs.
// Each file is only downloaded by the browser the first time it's needed, which keeps the app fast to open.

import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Edition } from '../types'
import { db } from '../db'
import { homebrewToSpell, matchesEdition } from '../lib/homebrew'

// One part of an action's damage, e.g. 1d6+2 Slashing.
export type DamagePart = {
  dice: string
  type: string
  note?: string          // e.g. "Two handed"
  alternative?: boolean  // one of several options; pick the one that applies
}

// A spell a monster can cast, and how often.
export type MonsterSpell = {
  index: string
  name: string
  level: number                    // 0 = cantrip
  usage?: 'atWill' | number        // number = uses per day; undefined = uses a spell slot (or limited by the trait)
  notes?: string
}

export type Spellcasting = {
  ability?: string                 // e.g. "INT"
  dc?: number
  attack?: number                  // spell attack bonus (2014); otherwise DC − 8
  level?: number                   // caster level (2014), scales cantrips
  slots?: Record<string, number>   // spell level → slots per day (2014)
  spells: MonsterSpell[]
}

// A named block of text in a stat block (a trait or an action), plus the numbers needed to roll it.
export type Feature = {
  name: string
  desc: string
  attack?: number                  // attack bonus, e.g. +4
  damage?: DamagePart[]
  dc?: { ability: string; value: number; success: 'half' | 'none' | string }
  usage?: { type: 'recharge'; min: number } | { type: 'perDay'; times: number } | { type: 'rest' }
  spellcasting?: Spellcasting
}

export type Monster = {
  index: string
  name: string
  homebrew?: boolean     // true for the GM's own monsters
  environments?: string[]  // homebrew only: where it lives, for random encounters (SRD ones are in data/environments.ts)
  meta: string           // size, type and alignment, e.g. "Small, humanoid, neutral evil"
  ac: number
  acNote?: string
  hp: number
  hitDice: string
  speed: string
  abilities: number[]    // STR, DEX, CON, INT, WIS, CHA
  saves?: string
  skills?: string
  vulnerabilities?: string
  resistances?: string
  immunities?: string
  conditionImmunities?: string
  senses: string
  languages?: string
  cr: number
  xp: number
  traits?: Feature[]
  actions?: Feature[]
  bonusActions?: Feature[]
  reactions?: Feature[]
  legendaryActions?: Feature[]
}

export type Spell = {
  index: string
  name: string
  homebrew?: boolean     // true for the GM's own spells
  level: number          // 0 = cantrip
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  concentration: boolean
  ritual: boolean
  desc: string
  higherLevel?: string
  classes: string[]
  attackType?: 'melee' | 'ranged'          // set for spell attacks
  damageType?: string
  damageBySlot?: Record<string, string>    // slot level → damage dice
  damageByLevel?: Record<string, string>   // cantrips: caster level → damage dice
  healBySlot?: Record<string, string>      // slot level → healing dice (may contain "MOD")
  saveAbility?: string                     // e.g. "DEX" for saving throw spells
  saveSuccess?: string                     // 'half' if a successful save halves the damage
}

export type MagicItem = {
  index: string
  name: string
  rarity: string         // plain rarity, e.g. "Uncommon" (what loot and shops match on)
  rarityNote?: string    // the rest of the data's rarity, e.g. "+1" from "Uncommon (+1)"
  category: string
  attunement: boolean
  desc: string
}

// Mundane equipment with its price (for Quick Lookup and the shop generator).
export type Equipment = {
  index: string
  name: string
  category: 'Weapon' | 'Armor' | 'Adventuring Gear' | 'Tools' | 'Mounts and Vehicles' | 'Ammunition'
  detail?: string        // e.g. "Martial Melee", "Heavy", "Artisan's Tools"
  cost?: string          // as written, e.g. "5 sp"
  costGp?: number        // the same in gold pieces, e.g. 0.5
  weight?: number
  damage?: string        // weapons, e.g. "1d8 Slashing (two-handed 1d10)"
  properties?: string[]
  ac?: string            // armour, e.g. "12 + Dex (max 2)"
  strength?: number      // minimum Strength for heavy armour
  stealthDisadvantage?: boolean
  desc?: string
}

// Conditions and rules sections are both just a name and Markdown text.
export type TextEntry = { index: string; name: string; desc: string }

// Maps each category to the type of its entries.
export type SrdData = {
  monsters: Monster
  spells: Spell
  conditions: TextEntry
  'magic-items': MagicItem
  equipment: Equipment
  rules: TextEntry
}
export type Category = keyof SrdData

// Vite turns each JSON file into a function that loads it on demand.
const files = import.meta.glob<unknown[]>('./srd/*/*.json', { import: 'default' })

// Loaded files are kept here, so switching back and forth doesn't load them again.
const cache = new Map<string, unknown[]>()

export async function loadSrd<C extends Category>(edition: Edition, category: C): Promise<SrdData[C][]> {
  const path = `./srd/${edition}/${category}.json`
  if (!cache.has(path)) cache.set(path, files[path] ? await files[path]() : [])  // 2024 has no rules file
  return cache.get(path) as SrdData[C][]
}

// Homebrew entries for a category and edition (only monsters and spells can be homebrew).
async function loadHomebrew(edition: Edition, category: Category): Promise<unknown[]> {
  if (category === 'monsters') {
    return (await db.homebrewMonsters.toArray()).filter((m) => matchesEdition(m.edition, edition))
  }
  if (category === 'spells') {
    return (await db.homebrewSpells.toArray()).filter((s) => matchesEdition(s.edition, edition)).map(homebrewToSpell)
  }
  return []
}

// React hook: returns the entries for a category (SRD plus homebrew, by name), or null while they're still loading.
export function useSrd<C extends Category>(edition: Edition, category: C): SrdData[C][] | null {
  const key = `${edition}/${category}`
  const [loaded, setLoaded] = useState<{ key: string; data: SrdData[C][] } | null>(null)

  useEffect(() => {
    let current = true  // set to false if the edition/category changes before loading finishes
    loadSrd(edition, category).then((data) => {
      if (current) setLoaded({ key, data })
    })
    return () => {
      current = false
    }
  }, [edition, category, key])

  // Re-runs whenever homebrew is added, edited or deleted.
  const homebrew = useLiveQuery(() => loadHomebrew(edition, category), [edition, category])

  // Only return data that matches what was asked for (not the previous edition's data).
  const srd = loaded?.key === key ? loaded.data : null
  if (!srd || !homebrew) return null
  if (homebrew.length === 0) return srd
  // Like SELECT ... FROM srd UNION ALL SELECT ... FROM homebrew ORDER BY name.
  return [...srd, ...(homebrew as SrdData[C][])].sort((a, b) => a.name.localeCompare(b.name))
}

// Finds the stat block for any combatant, whichever edition it was added from (SRD or homebrew).
// Returns undefined for creatures added by hand, or while the data is loading.
export function useMonsterLookup(): (ref: { edition: Edition; index: string } | undefined) => Monster | undefined {
  const by2014 = useSrd('2014', 'monsters')
  const by2024 = useSrd('2024', 'monsters')
  return (ref) => (ref ? (ref.edition === '2014' ? by2014 : by2024)?.find((m) => m.index === ref.index) : undefined)
}
