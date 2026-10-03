// Filters for the monster and spell lists in Quick Lookup (and the encounter builder's monster
// picker): CR, type, size, environment, legendary, homebrew and damage defences for monsters;
// class, level, school, concentration, ritual, casting time, attack / save and damage type for
// spells. Each filter is like an extra AND in a WHERE clause; empty means "any".

import type { Monster, Spell } from '../data/srd'
import { environmentsOf } from '../data/environments'

export const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']

// Every challenge rating, for the CR range drop-downs.
export const CR_VALUES = [0, 0.125, 0.25, 0.5, ...Array.from({ length: 30 }, (_, i) => i + 1)]

export const DAMAGE_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder']

// --- Monsters ----------------------------------------------------------------------------

export type DefenseFilter = 'any' | 'immune' | 'resistant' | 'vulnerable'

export type MonsterFilters = {
  crMin: string           // '' = any, otherwise a CR as text (e.g. '0.5')
  crMax: string
  type: string            // e.g. 'dragon'
  size: string            // e.g. 'Large'
  environment: string     // e.g. 'forest'
  legendary: boolean
  homebrew: boolean
  damageType: string      // e.g. 'fire'
  defense: DefenseFilter  // which defence to the damage type: resistant or immune (any), or one of them
  sort: 'name' | 'cr'
}

export const NO_MONSTER_FILTERS: MonsterFilters = {
  crMin: '', crMax: '', type: '', size: '', environment: '', legendary: false, homebrew: false, damageType: '', defense: 'any', sort: 'name',
}

// The creature type from the stat block line, e.g. "Huge, fiend (demon), chaotic evil" → "fiend".
// Swarms count as "swarm".
export function monsterType(m: Pick<Monster, 'meta'>): string {
  const type = (m.meta.split(', ')[1] ?? '').replace(/\s*\(.*\)/, '').toLowerCase()
  return type.startsWith('swarm') ? 'swarm' : type
}

// The sizes a monster can be: "Medium or small" → ['Medium', 'Small'].
export function monsterSizes(m: Pick<Monster, 'meta'>): string[] {
  const text = (m.meta.split(', ')[0] ?? '').toLowerCase()
  return SIZES.filter((s) => new RegExp(`\\b${s.toLowerCase()}\\b`).test(text))
}

// Whether a defence line ("fire; bludgeoning from nonmagical attacks") mentions the damage type.
const mentions = (text: string | undefined, type: string) => !!text && new RegExp(`\\b${type}\\b`, 'i').test(text)

// How many filters are switched on (for the "Filters (2)" button).
export function activeMonsterFilters(f: MonsterFilters): number {
  return [f.crMin, f.crMax, f.type, f.size, f.environment, f.damageType].filter(Boolean).length + Number(f.legendary) + Number(f.homebrew)
}

export function monsterMatches(m: Monster, f: MonsterFilters): boolean {
  if (f.crMin && m.cr < Number(f.crMin)) return false
  if (f.crMax && m.cr > Number(f.crMax)) return false
  if (f.type && monsterType(m) !== f.type) return false
  if (f.size && !monsterSizes(m).includes(f.size)) return false
  if (f.environment && !environmentsOf(m).includes(f.environment as never)) return false
  if (f.legendary && !m.legendaryActions?.length) return false
  if (f.homebrew && !m.homebrew) return false
  if (f.damageType) {
    const immune = mentions(m.immunities, f.damageType)
    const resistant = mentions(m.resistances, f.damageType)
    const ok = f.defense === 'immune' ? immune
      : f.defense === 'resistant' ? resistant
      : f.defense === 'vulnerable' ? mentions(m.vulnerabilities, f.damageType)
      : immune || resistant
    if (!ok) return false
  }
  return true
}

// Sorts by the chosen order: name, or CR (lowest first) then name.
export function compareMonsters(a: Pick<Monster, 'name' | 'cr'>, b: Pick<Monster, 'name' | 'cr'>, sort: MonsterFilters['sort']): number {
  return (sort === 'cr' ? a.cr - b.cr : 0) || a.name.localeCompare(b.name)
}

// --- Spells ------------------------------------------------------------------------------

export type CastingTime = 'action' | 'bonus' | 'reaction' | 'longer'
export const CASTING_TIME_LABELS: Record<CastingTime, string> = { action: 'Action', bonus: 'Bonus action', reaction: 'Reaction', longer: '1 minute or longer' }

export type SpellFilters = {
  cls: string            // e.g. 'Wizard'
  level: string          // '' = any, '0' = cantrip
  school: string
  concentration: boolean
  ritual: boolean
  castingTime: '' | CastingTime
  attackSave: string     // '' = any, 'attack', 'save', or a save ability like 'DEX'
  damageType: string     // e.g. 'Fire'
}

export const NO_SPELL_FILTERS: SpellFilters = {
  cls: '', level: '', school: '', concentration: false, ritual: false, castingTime: '', attackSave: '', damageType: '',
}

// "1 action", "Action (Overgrowth) or 8 hours", "Bonus Action, which you take…" → the kind of time.
export function castingTimeOf(s: Pick<Spell, 'castingTime'>): CastingTime {
  const text = s.castingTime.toLowerCase()
  if (/^(1 )?bonus action/.test(text)) return 'bonus'
  if (/^(1 )?reaction/.test(text)) return 'reaction'
  if (/^(1 )?action/.test(text)) return 'action'
  return 'longer'
}

export function activeSpellFilters(f: SpellFilters): number {
  return [f.cls, f.level, f.school, f.castingTime, f.attackSave, f.damageType].filter(Boolean).length + Number(f.concentration) + Number(f.ritual)
}

export function spellMatches(s: Spell, f: SpellFilters): boolean {
  if (f.cls && !s.classes.includes(f.cls)) return false
  if (f.level && s.level !== Number(f.level)) return false
  if (f.school && s.school !== f.school) return false
  if (f.concentration && !s.concentration) return false
  if (f.ritual && !s.ritual) return false
  if (f.castingTime && castingTimeOf(s) !== f.castingTime) return false
  if (f.attackSave === 'attack' && !s.attackType) return false
  if (f.attackSave === 'save' && !s.saveAbility) return false
  if (f.attackSave && !['attack', 'save'].includes(f.attackSave) && s.saveAbility !== f.attackSave) return false
  if (f.damageType && s.damageType?.toLowerCase() !== f.damageType.toLowerCase()) return false
  return true
}

// Level, then name.
export const compareSpells = (a: Pick<Spell, 'name' | 'level'>, b: Pick<Spell, 'name' | 'level'>) => a.level - b.level || a.name.localeCompare(b.name)

// The distinct values of something in a list, sorted (for drop-downs built from the data).
export const distinct = (values: (string | undefined)[]) => [...new Set(values.filter((v): v is string => !!v))].sort()
