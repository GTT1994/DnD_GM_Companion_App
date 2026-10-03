// Lairs in the combat tracker: making a lair combatant, which lair actions can be used this round
// (not the same one two rounds running), and "in lair" use counts from stat blocks
// ("Legendary Resistance (3/Day, or 4/Day in Lair)").

import type { Combatant } from '../types'

export const LAIR_INITIATIVE = 20

// A new lair for the fight. It has no HP or AC; the tracker shows its actions instead.
export function newLair(name: string, actions: string[], initiative = LAIR_INITIATIVE): Combatant {
  return {
    id: crypto.randomUUID(), name, initiative, isPlayer: false,
    hp: 0, maxHp: 0, tempHp: 0, ac: 0, conditions: [],
    lair: { actions },
  }
}

// The lines typed into the lair actions box, without blanks.
export const lairActionLines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean)

// Whether a lair action was used this round, or last round (so it can't be used again yet).
export function lairActionState(c: Combatant, index: number, round: number): 'thisRound' | 'lastRound' | null {
  const used = c.lair?.used
  if (!used || used.index !== index) return null
  if (used.round === round) return 'thisRound'
  return used.round === round - 1 ? 'lastRound' : null
}

// The higher in-lair number from a feature name, e.g. "(3/Day, or 4/Day in Lair)" → 4.
export function inLairTimes(featureName: string): number | undefined {
  const match = featureName.match(/(\d+)\/Day in Lair/i)
  return match ? parseInt(match[1]) : undefined
}

// Everyone who can be targeted, healed or make saves: not lairs.
export const creatures = (combatants: Combatant[]) => combatants.filter((c) => !c.lair)
