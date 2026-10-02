// Homebrew monsters and spells: creating, copying from the SRD, saving, and converting
// homebrew spells into the same shape as SRD spells so the rest of the app can use them.

import { db, type HomebrewEdition, type HomebrewMonster, type HomebrewSpell } from '../db'
import type { Feature, Monster, MonsterSpell, Spell } from '../data/srd'
import type { Edition } from '../types'
import { addDice, multiplyDice, parseDice } from './dice'
import { environmentsOf } from '../data/environments'

// Does a homebrew entry show up in this edition? Like WHERE edition IN (@edition, 'both').
export function matchesEdition(tag: HomebrewEdition, edition: Edition): boolean {
  return tag === 'both' || tag === edition
}

const newIndex = () => `hb-${crypto.randomUUID()}`

// --- Spells: base + per-level dice ↔ per-level tables ----------------------------------

// Builds a slot level → dice table: the base dice at the spell's level, plus the extra dice for each level above.
// Cantrips instead scale at caster levels 5, 11 and 17 (×2, ×3, ×4 dice).
function levelTable(level: number, base: string, perLevel?: string): Record<string, string> {
  if (level === 0) return { 1: base, 5: multiplyDice(base, 2), 11: multiplyDice(base, 3), 17: multiplyDice(base, 4) }
  const table: Record<string, string> = {}
  for (let slot = level; slot <= 9; slot++) {
    table[slot] = perLevel && slot > level ? addDice(base, multiplyDice(perLevel, slot - level)) : base
  }
  return table
}

// Healing dice may end in "+ MOD" (the caster's ability modifier): scale the dice, then put MOD back.
function healTable(level: number, base: string, perLevel?: string): Record<string, string> {
  const hasMod = /\+\s*MOD/i.test(base)
  const dice = base.replace(/\s*\+\s*MOD/i, '')
  const table = levelTable(level, dice, perLevel)
  return hasMod ? Object.fromEntries(Object.entries(table).map(([slot, d]) => [slot, `${d} + MOD`])) : table
}

// Per-level dice, or undefined if empty or not valid dice (e.g. while still being typed).
const validOrNone = (dice?: string) => (dice && parseDice(dice) ? dice : undefined)

// Turns a stored homebrew spell into an ordinary Spell, with the per-level damage/healing tables filled in.
export function homebrewToSpell(hb: HomebrewSpell): Spell {
  const spell: Spell = { ...hb, homebrew: true, damageBySlot: undefined, damageByLevel: undefined, healBySlot: undefined }
  if (hb.damageDice && parseDice(hb.damageDice)) {
    const table = levelTable(hb.level, hb.damageDice, validOrNone(hb.damagePerLevel))
    if (hb.level === 0) spell.damageByLevel = table
    else spell.damageBySlot = table
  }
  if (hb.healDice && parseDice(hb.healDice.replace(/\s*\+\s*MOD/i, ''))) {
    spell.healBySlot = healTable(hb.level, hb.healDice, validOrNone(hb.healPerLevel))
  }
  return spell
}

// Works out the extra dice per level from two neighbouring entries, e.g. 8d6 → 9d6 gives "1d6".
function perLevelFrom(base?: string, next?: string): string | undefined {
  const a = base && parseDice(base)
  const b = next && parseDice(next)
  if (!a || !b || a.dice.length !== 1 || b.dice.length !== 1 || a.dice[0].sides !== b.dice[0].sides) return undefined
  const extra = b.dice[0].count - a.dice[0].count
  return extra > 0 ? `${extra}d${a.dice[0].sides}` : undefined
}

// Turns an SRD spell into homebrew form (base dice + per level), for "Make homebrew copy".
export function spellToHomebrew(spell: Spell, edition: HomebrewEdition): HomebrewSpell {
  const damageTable = spell.level === 0 ? spell.damageByLevel ?? spell.damageBySlot : spell.damageBySlot
  const baseKey = spell.level === 0 ? (spell.damageByLevel ? '1' : '0') : String(spell.level)
  const damageDice = damageTable?.[baseKey]?.split(/\s+OR\s+/i)[0]
  const healDice = spell.healBySlot?.[String(spell.level)]
  const stripMod = (d?: string) => d?.replace(/\s*\+\s*MOD/i, '')
  return {
    ...spell,
    index: newIndex(),
    homebrew: true,
    edition,
    updatedAt: Date.now(),
    damageDice,
    damagePerLevel: spell.level > 0 ? perLevelFrom(damageDice, damageTable?.[String(spell.level + 1)]) : undefined,
    healDice,
    healPerLevel: perLevelFrom(stripMod(healDice), stripMod(spell.healBySlot?.[String(spell.level + 1)])),
    damageBySlot: undefined,
    damageByLevel: undefined,
    healBySlot: undefined,
  }
}

export function blankSpell(edition: HomebrewEdition): HomebrewSpell {
  return {
    index: newIndex(), name: '', homebrew: true, edition, updatedAt: Date.now(),
    level: 1, school: 'Evocation', castingTime: 'Action', range: '60 feet', components: 'V, S',
    duration: 'Instantaneous', concentration: false, ritual: false, desc: '', classes: [],
  }
}

// --- Monsters ----------------------------------------------------------------------------

// Experience points for each challenge rating.
export const XP_BY_CR: Record<string, number> = {
  0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900,
  9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000,
  19: 22000, 20: 25000, 21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000,
  28: 120000, 29: 135000, 30: 155000,
}

export const CHALLENGE_RATINGS = Object.keys(XP_BY_CR).map(Number).sort((a, b) => a - b)

export function blankMonster(edition: HomebrewEdition): HomebrewMonster {
  return {
    index: newIndex(), name: '', homebrew: true, edition, updatedAt: Date.now(),
    meta: 'Medium, humanoid, neutral', ac: 12, hp: 11, hitDice: '2d8+2', speed: '30 ft.',
    abilities: [10, 10, 10, 10, 10, 10], senses: 'passive Perception 10', cr: 0.25, xp: 50,
    actions: [],
  }
}

// A homebrew copy of any monster (SRD or homebrew), with a new index so the original is left alone.
// A copy keeps the SRD monster's environments (for random encounters) as its own list.
export function copyMonster(monster: Monster, edition: HomebrewEdition): HomebrewMonster {
  return { ...structuredClone(monster), index: newIndex(), homebrew: true, edition, environments: environmentsOf(monster), updatedAt: Date.now() }
}

// The usage suffix shown after a trait's name, e.g. "Recharge 5–6" or "3/Day".
export function usageLabel(usage: Feature['usage']): string {
  if (!usage) return ''
  if (usage.type === 'recharge') return usage.min === 6 ? 'Recharge 6' : `Recharge ${usage.min}–6`
  if (usage.type === 'perDay') return `${usage.times}/Day`
  return 'Recharges after a Short or Long Rest'
}

// Removes a usage suffix from a name, e.g. "Fire Breath (Recharge 5–6)" → "Fire Breath".
export function stripUsageLabel(name: string): string {
  return name.replace(/\s*\((Recharge [^)]*|\d+\/Day[^)]*|Recharges after [^)]*)\)\s*$/i, '')
}

// --- Saving --------------------------------------------------------------------------------

export function saveMonster(monster: HomebrewMonster) {
  return db.homebrewMonsters.put({ ...monster, updatedAt: Date.now() })
}

export function saveSpell(spell: HomebrewSpell) {
  return db.homebrewSpells.put({ ...spell, updatedAt: Date.now() })
}

// Adds a copy with a new index and "(copy)" after the name.
export async function duplicateMonster(monster: HomebrewMonster) {
  const copy = { ...copyMonster(monster, monster.edition), name: `${monster.name} (copy)` }
  await db.homebrewMonsters.add(copy)
  return copy.index
}

export async function duplicateSpell(spell: HomebrewSpell) {
  const copy = { ...structuredClone(spell), index: newIndex(), name: `${spell.name} (copy)`, updatedAt: Date.now() }
  await db.homebrewSpells.add(copy)
  return copy.index
}

// --- Spell list text for a Spellcasting description ---------------------------------------

// Writes a monster's spells as a Markdown list grouped the way stat blocks show them,
// e.g. "- **At Will:** Light, Mage Hand" / "- **1/Day Each:** Fireball" / "- **3rd Level (3 slots):** Fly".
export function spellListMarkdown(spells: MonsterSpell[], slots?: Record<string, number>): string {
  const groups = new Map<string, string[]>()
  for (const s of spells) {
    const label = s.usage === 'atWill' ? 'At Will'
      : typeof s.usage === 'number' ? `${s.usage}/Day`
      : s.level === 0 ? 'Cantrips'
      : slots?.[s.level] ? `Level ${s.level} (${slots[s.level]} slot${slots[s.level] === 1 ? '' : 's'})`
      : 'Spells'
    groups.set(label, [...(groups.get(label) ?? []), s.notes ? `${s.name} (${s.notes})` : s.name])
  }
  // At Will first, then most uses per day, then cantrips and slot levels in order.
  const order = (label: string) =>
    label === 'At Will' ? -100 : label.includes('/Day') ? -parseInt(label) : label === 'Cantrips' ? 0 : parseInt(label.replace(/\D+/, '')) || 50
  return [...groups]
    .sort(([a], [b]) => order(a) - order(b))
    .map(([label, names]) => `- **${label}${names.length > 1 && label.includes('/Day') ? ' Each' : ''}:** ${names.join(', ')}`)
    .join('\n')
}

// Replaces the spell list at the end of a description (lines starting "- **") with a fresh one, or adds it.
export function withSpellList(desc: string, list: string): string {
  const withoutOld = desc.replace(/(\n+- \*\*[^\n]*)+\s*$/, '').trimEnd()
  return list ? `${withoutOld}\n\n${list}` : withoutOld
}

// Damage types and ability names, for the editors' drop-downs.
export const DAMAGE_TYPES = [
  'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic',
  'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder',
]

export const ABILITY_NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

// --- Checking before saving ------------------------------------------------------------------

export const FEATURE_SECTIONS = [
  { key: 'traits', label: 'Traits' },
  { key: 'actions', label: 'Actions' },
  { key: 'bonusActions', label: 'Bonus Actions' },
  { key: 'reactions', label: 'Reactions' },
  { key: 'legendaryActions', label: 'Legendary Actions' },
] as const

const validDice = (dice?: string) => !dice || parseDice(dice) !== null
const validHealDice = (dice?: string) => !dice || parseDice(dice.replace(/\s*\+\s*MOD/i, '')) !== null

// Problems that stop a homebrew monster being saved; an empty list means it's fine.
export function monsterProblems(m: Monster): string[] {
  const problems: string[] = []
  if (!m.name.trim()) problems.push('The monster needs a name.')
  if (!validDice(m.hitDice)) problems.push('Hit dice must be dice, like 4d8+4.')
  for (const { key, label } of FEATURE_SECTIONS) {
    for (const f of m[key] ?? []) {
      const where = `${label}: ${stripUsageLabel(f.name) || 'unnamed'}`
      if (!stripUsageLabel(f.name).trim()) problems.push(`${label}: every entry needs a name.`)
      if (f.damage?.some((d) => !parseDice(d.dice))) problems.push(`${where}: damage must be dice, like 1d6+2.`)
    }
  }
  return problems
}

// Problems that stop a homebrew spell being saved.
export function spellProblems(s: HomebrewSpell): string[] {
  const problems: string[] = []
  if (!s.name.trim()) problems.push('The spell needs a name.')
  if (!validDice(s.damageDice) || !validDice(s.damagePerLevel)) problems.push('Damage must be dice, like 8d6.')
  if (!validHealDice(s.healDice) || !validDice(s.healPerLevel)) problems.push('Healing must be dice, like 1d8 + MOD.')
  return problems
}
