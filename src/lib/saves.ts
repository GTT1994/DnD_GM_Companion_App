// Saving throws: a monster's bonus for each ability, rolling a save (with advantage or
// disadvantage), and how much damage a creature takes after a save.

import type { Ability } from '../types'
import type { Monster } from '../data/srd'
import { abilityMod, type Random } from './dice'
import { rollToHit, type D20Mode } from './actions'

export const ABILITIES: Ability[] = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha']

export const ABILITY_LABELS: Record<Ability, string> = {
  Str: 'Strength', Dex: 'Dexterity', Con: 'Constitution', Int: 'Intelligence', Wis: 'Wisdom', Cha: 'Charisma',
}

// Turns the different spellings in the data ("DEX", "dex", "Dexterity") into one, or undefined.
export function toAbility(name: string | undefined): Ability | undefined {
  const short = name?.trim().slice(0, 3).toLowerCase()
  return ABILITIES.find((a) => a.toLowerCase() === short)
}

// A monster's save bonus: from its saving throw proficiencies ("Dex +6, Wis +7") if listed,
// otherwise just the ability modifier.
export function saveBonus(monster: Pick<Monster, 'abilities' | 'saves'>, ability: Ability): number {
  const listed = monster.saves?.match(new RegExp(`\\b${ability}\\w*\\s*([+-]\\s*\\d+)`, 'i'))
  if (listed) return parseInt(listed[1].replace(/\s/g, ''))
  return abilityMod(monster.abilities[ABILITIES.indexOf(ability)])
}

// Rolls a saving throw: d20 (two with advantage/disadvantage) + bonus, against the DC.
export function rollSave(bonus: number, dc: number, mode: D20Mode = 'normal', random: Random = Math.random) {
  const r = rollToHit(bonus, mode, random)
  return { ...r, passed: r.total >= dc }
}

export type OnSuccess = 'half' | 'none'

// Damage after a save: full on a failure; half (rounded down) or none on a success.
export function damageAfterSave(amount: number, passed: boolean, onSuccess: OnSuccess): number {
  if (!passed) return amount
  return onSuccess === 'half' ? Math.floor(amount / 2) : 0
}

// A group save to start with some boxes filled in, e.g. from a dragon's Fire Breath.
export type GroupSavePreset = {
  label?: string         // e.g. "Adult Red Dragon · Fire Breath"
  sourceId?: string      // the creature causing it (its turn is the default for durations)
  ability?: Ability
  dc?: number
  damage?: string        // dice or a number
  damageType?: string
  onSuccess?: OnSuccess
}
