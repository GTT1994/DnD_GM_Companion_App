// Rules for rolling monster actions and spells: to-hit with advantage, which damage parts
// apply, spell damage by slot or caster level, spell slots, and limited-use tracking keys.

import type { DamagePart, Spell, Spellcasting } from '../data/srd'
import { rollDie, type Random } from './dice'

export type D20Mode = 'normal' | 'advantage' | 'disadvantage'

// Rolls a d20 attack: two dice with advantage/disadvantage (keeping the higher/lower), plus the bonus.
export function rollToHit(bonus: number, mode: D20Mode, random: Random = Math.random) {
  const rolls = mode === 'normal' ? [rollDie(20, random)] : [rollDie(20, random), rollDie(20, random)]
  const natural = mode === 'disadvantage' ? Math.min(...rolls) : Math.max(...rolls)
  return { rolls, natural, total: natural + bonus, bonus }
}

// Which damage parts start ticked. The first always does; an extra part starts unticked when its
// part of the description makes it conditional (e.g. "plus 2 (1d4) damage if the attack roll had
// Advantage" or "Failure: 9 (2d8) Poison damage"). For a choice of damage, only the first option is ticked.
export function defaultIncluded(desc: string, parts: DamagePart[]): boolean[] {
  const firstAlternative = parts.findIndex((p) => p.alternative)
  return parts.map((part, i) => {
    if (part.alternative) return i === firstAlternative
    if (i === 0) return true
    // Find "(1d4)" in the text, allowing spaces like "(1d6 + 2)".
    const pattern = new RegExp(`\\(\\s*${part.dice.replace(/\s/g, '').replace(/[+-]/g, (sign) => `\\s*\\${sign}\\s*`)}\\s*\\)`)
    const match = pattern.exec(desc)
    if (!match) return true
    // The clause around it: from the previous , ; or . to the next full stop.
    const start = Math.max(desc.lastIndexOf(',', match.index), desc.lastIndexOf(';', match.index), desc.lastIndexOf('.', match.index)) + 1
    const end = desc.indexOf('.', match.index)
    const clause = desc.slice(start, end === -1 ? undefined : end)
    return !/\b(if|when|while|instead|unless)\b|saving throw|failed save|failure:/i.test(clause)
  })
}

// A monster's spell attack bonus: given in the 2014 data, otherwise worked out from the save DC (DC − 8).
export function spellAttackBonus(sc: Spellcasting): number | undefined {
  return sc.attack ?? (sc.dc !== undefined ? sc.dc - 8 : undefined)
}

// The damage dice for a spell cast at a slot level, or for a cantrip at the caster's level.
// Uses the closest entry at or below the level, e.g. Fire Bolt for a level 7 caster uses the level 5 dice.
export function spellDamageDice(spell: Spell, slotLevel: number, casterLevel = 1): string | undefined {
  const table = spell.level === 0 ? spell.damageByLevel ?? spell.damageBySlot : spell.damageBySlot
  if (!table) return undefined
  const level = spell.level === 0 && spell.damageByLevel ? casterLevel : slotLevel
  const keys = Object.keys(table).map(Number).filter((k) => k <= level).sort((a, b) => b - a)
  const dice = table[String(keys[0] ?? Math.min(...Object.keys(table).map(Number)))]
  return dice.split(/\s+OR\s+/i)[0]  // a few 2014 entries list two options, e.g. "4d6 OR 5d6"
}

// The healing dice for a spell at a slot level, with "MOD" replaced by the caster's ability modifier.
export function spellHealDice(spell: Spell, slotLevel: number, abilityModifier: number): string | undefined {
  const dice = spell.healBySlot?.[String(slotLevel)]
  return dice?.replace(/\s*\+\s*MOD/i, abilityModifier >= 0 ? `+${abilityModifier}` : `${abilityModifier}`)
}

// Spell slot levels that still have a slot left, at or above the spell's level (for upcasting).
export function availableSlotLevels(sc: Spellcasting, uses: Record<string, number>, minLevel: number): number[] {
  return Object.entries(sc.slots ?? {})
    .map(([level, count]) => ({ level: Number(level), left: count - (uses[slotKey(Number(level))] ?? 0) }))
    .filter((s) => s.level >= Math.max(1, minLevel) && s.left > 0)
    .map((s) => s.level)
}

// The DC to keep concentration after taking damage: 10 or half the damage, whichever is higher.
export function concentrationDc(damage: number): number {
  return Math.max(10, Math.floor(damage / 2))
}

// Keys for the "uses" record saved on each combatant (how many times something has been used).
export const featureKey = (featureName: string) => `feature:${featureName}`
export const spellKey = (featureName: string, spellIndex: string) => `spell:${featureName}:${spellIndex}`
export const slotKey = (level: number) => `slot:${level}`
export const LEGENDARY_KEY = 'legendary'
