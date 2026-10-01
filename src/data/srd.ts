// Loads the SRD rules data (monsters, spells, etc.) for each edition.
// The JSON files in ./srd are built by scripts/build-srd.mjs. Each file is only
// downloaded by the browser the first time it's needed, which keeps the app fast to open.

import { useEffect, useState } from 'react'
import type { Edition } from '../types'

// A named block of text in a stat block, e.g. a trait or an action.
export type Feature = { name: string; desc: string }

export type Monster = {
  index: string
  name: string
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
}

export type MagicItem = {
  index: string
  name: string
  rarity: string
  category: string
  attunement: boolean
  desc: string
}

// Conditions and rules sections are both just a name and Markdown text.
export type TextEntry = { index: string; name: string; desc: string }

// Maps each category to the type of its entries.
export type SrdData = {
  monsters: Monster
  spells: Spell
  conditions: TextEntry
  'magic-items': MagicItem
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

// React hook: returns the entries for a category, or null while they're still loading.
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

  // Only return data that matches what was asked for (not the previous edition's data).
  return loaded?.key === key ? loaded.data : null
}
