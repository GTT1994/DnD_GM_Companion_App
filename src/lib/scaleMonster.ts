// Scales a monster to a new challenge rating using the DMG's "Monster Statistics by Challenge
// Rating" table. Rather than replacing its numbers with the table's, it moves each one by the
// difference between the two rows (AC, attack bonus, save DCs, proficiency), and multiplies HP and
// damage by the ratio of the rows' typical values, so the monster keeps its character.

import type { DamagePart, Feature, Monster } from '../data/srd'
import { formatCr, parseDice, signed } from './dice'
import { XP_BY_CR } from './homebrew'

// One row of the table: proficiency bonus, AC, HP range, attack bonus, damage per round range, save DC.
type CrRow = { prof: number; ac: number; hp: [number, number]; attack: number; damage: [number, number]; dc: number }

const row = (prof: number, ac: number, hpLow: number, hpHigh: number, attack: number, dmgLow: number, dmgHigh: number, dc: number): CrRow =>
  ({ prof, ac, hp: [hpLow, hpHigh], attack, damage: [dmgLow, dmgHigh], dc })

export const CR_TABLE: Record<number, CrRow> = {
  0: row(2, 13, 1, 6, 3, 0, 1, 13),
  0.125: row(2, 13, 7, 35, 3, 2, 3, 13),
  0.25: row(2, 13, 36, 49, 3, 4, 5, 13),
  0.5: row(2, 13, 50, 70, 3, 6, 8, 13),
  1: row(2, 13, 71, 85, 3, 9, 14, 13),
  2: row(2, 13, 86, 100, 3, 15, 20, 13),
  3: row(2, 13, 101, 115, 4, 21, 26, 13),
  4: row(2, 14, 116, 130, 5, 27, 32, 14),
  5: row(3, 15, 131, 145, 6, 33, 38, 15),
  6: row(3, 15, 146, 160, 6, 39, 44, 15),
  7: row(3, 15, 161, 175, 6, 45, 50, 15),
  8: row(3, 16, 176, 190, 7, 51, 56, 16),
  9: row(4, 16, 191, 205, 7, 57, 62, 16),
  10: row(4, 17, 206, 220, 7, 63, 68, 16),
  11: row(4, 17, 221, 235, 8, 69, 74, 17),
  12: row(4, 17, 236, 250, 8, 75, 80, 17),
  13: row(5, 18, 251, 265, 8, 81, 86, 18),
  14: row(5, 18, 266, 280, 8, 87, 92, 18),
  15: row(5, 18, 281, 295, 8, 93, 98, 18),
  16: row(5, 18, 296, 310, 9, 99, 104, 18),
  17: row(6, 19, 311, 325, 10, 105, 110, 19),
  18: row(6, 19, 326, 340, 10, 111, 116, 19),
  19: row(6, 19, 341, 355, 10, 117, 122, 19),
  20: row(6, 19, 356, 400, 10, 123, 140, 19),
  21: row(7, 19, 401, 445, 11, 141, 158, 20),
  22: row(7, 19, 446, 490, 11, 159, 176, 20),
  23: row(7, 19, 491, 535, 11, 177, 194, 20),
  24: row(7, 19, 536, 580, 12, 195, 212, 21),
  25: row(8, 19, 581, 625, 12, 213, 230, 21),
  26: row(8, 19, 626, 670, 12, 231, 248, 21),
  27: row(8, 19, 671, 715, 13, 249, 266, 22),
  28: row(8, 19, 716, 760, 13, 267, 284, 22),
  29: row(9, 19, 761, 805, 13, 285, 302, 22),
  30: row(9, 19, 806, 850, 14, 303, 320, 23),
}

const middle = ([low, high]: [number, number]) => Math.max(1, (low + high) / 2)  // at least 1, so CR 0 doesn't divide by 0

// How much each number moves between two CRs.
export type ScaleSteps = { ac: number; attack: number; dc: number; prof: number; hpRatio: number; damageRatio: number }

export function scaleSteps(fromCr: number, toCr: number): ScaleSteps {
  const from = CR_TABLE[fromCr] ?? CR_TABLE[1]
  const to = CR_TABLE[toCr]
  return {
    ac: to.ac - from.ac,
    attack: to.attack - from.attack,
    dc: to.dc - from.dc,
    prof: to.prof - from.prof,
    hpRatio: middle(to.hp) / middle(from.hp),
    damageRatio: middle(to.damage) / middle(from.damage),
  }
}

// Average of dice text, rounded down the way stat blocks do: "2d8+4" → 13.
export function averageOf(dice: string): number {
  const parsed = parseDice(dice)
  if (!parsed) return 0
  return Math.floor(parsed.dice.reduce((sum, d) => sum + (d.count * (d.sides + 1)) / 2, 0) + parsed.modifier)
}

// Damage dice multiplied by the ratio: more (or fewer) dice, same modifier. "1d6+2" × 2.5 → "3d6+2".
export function scaleDamageDice(dice: string, ratio: number): string {
  const parsed = parseDice(dice)
  if (!parsed) return dice
  if (!parsed.dice.length) return `${Math.max(1, Math.round(parsed.modifier * ratio))}`  // flat damage, e.g. "1"
  const scaled = parsed.dice.map((d) => `${Math.max(1, Math.round(d.count * ratio))}d${d.sides}`).join('+')
  return parsed.modifier ? `${scaled}${parsed.modifier > 0 ? '+' : ''}${parsed.modifier}` : scaled
}

// Dice as stat blocks write them in text: "2d8+4" → "2d8 + 4".
const spaced = (dice: string) => dice.replace(/([+-])/g, ' $1 ')
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// New hit dice for the target HP, keeping the die size and Con bonus per die: "7d10+21" (59) → 154 HP → "18d10+54" (153).
export function scaleHitDice(hitDice: string, targetHp: number): { hp: number; hitDice: string } {
  const parsed = parseDice(hitDice)
  const die = parsed?.dice[0]
  if (!parsed || !die) return { hp: Math.max(1, Math.round(targetHp)), hitDice }
  const perDie = parsed.modifier / die.count  // the Con modifier
  const count = Math.max(1, Math.round(targetHp / ((die.sides + 1) / 2 + perDie)))
  const modifier = Math.round(perDie * count)
  const text = `${count}d${die.sides}${modifier ? signed(modifier) : ''}`
  return { hp: Math.max(1, averageOf(text)), hitDice: text }
}

// Adds a step to each number in a list like "Dex +5, Con +11" (saves and skills).
const shiftBonuses = (text: string | undefined, step: number) =>
  text?.replace(/([+-])(\d+)/g, (_, sign, n) => signed((sign === '-' ? -1 : 1) * parseInt(n) + step))

// One trait or action at the new CR: attack bonus, save DC and damage dice, in the numbers and the text.
function scaleFeature(f: Feature, steps: ScaleSteps): Feature {
  let desc = f.desc
  const next: Feature = { ...f }
  if (f.attack !== undefined) {
    next.attack = f.attack + steps.attack
    // "+6 to hit" (2014) and "Attack Roll: +4" (2024)
    desc = desc.replace(new RegExp(`${escape(signed(f.attack))}( to hit)`, 'g'), `${signed(next.attack)}$1`)
      .replace(new RegExp(`(Attack Roll: )${escape(signed(f.attack))}`, 'g'), `$1${signed(next.attack)}`)
  }
  if (f.damage?.length) {
    next.damage = f.damage.map((part): DamagePart => {
      const dice = scaleDamageDice(part.dice, steps.damageRatio)
      // "13 (2d8 + 4)" → "22 (4d8 + 4)"
      desc = desc.replace(new RegExp(`\\d+ \\(${escape(spaced(part.dice)).replace(/ /g, '\\s*')}\\)`), `${averageOf(dice)} (${spaced(dice)})`)
      return { ...part, dice }
    })
  }
  if (f.dc) next.dc = { ...f.dc, value: f.dc.value + steps.dc }
  if (f.spellcasting) {
    next.spellcasting = {
      ...f.spellcasting,
      dc: f.spellcasting.dc !== undefined ? f.spellcasting.dc + steps.dc : undefined,
      attack: f.spellcasting.attack !== undefined ? f.spellcasting.attack + steps.attack : undefined,
    }
    if (f.spellcasting.attack !== undefined) {
      desc = desc.replace(new RegExp(`${escape(signed(f.spellcasting.attack))}( to hit)`, 'g'), `${signed(f.spellcasting.attack + steps.attack)}$1`)
    }
  }
  // "DC 13" anywhere in the text (saves for this feature, or spells' DCs).
  if (steps.dc) desc = desc.replace(/DC (\d+)/g, (_, n) => `DC ${parseInt(n) + steps.dc}`)
  next.desc = desc
  return next
}

// The monster at the new CR, named e.g. "Ogre (CR 5)".
export function scaleMonster(m: Monster, toCr: number): Monster {
  const steps = scaleSteps(m.cr, toCr)
  const { hp, hitDice } = scaleHitDice(m.hitDice, m.hp * steps.hpRatio)
  const features = (list?: Feature[]) => list?.map((f) => scaleFeature(f, steps))
  const perception = /Perception/i.test(m.skills ?? '')
  return {
    ...m,
    name: `${m.name.replace(/ \(CR [^)]*\)$/, '')} (CR ${formatCr(toCr)})`,
    cr: toCr,
    xp: XP_BY_CR[toCr],
    ac: Math.max(5, m.ac + steps.ac),
    hp,
    hitDice,
    saves: shiftBonuses(m.saves, steps.prof),
    skills: shiftBonuses(m.skills, steps.prof),
    // Passive Perception moves with a proficient Perception skill.
    senses: perception ? m.senses.replace(/passive Perception (\d+)/i, (_, n) => `passive Perception ${parseInt(n) + steps.prof}`) : m.senses,
    traits: features(m.traits),
    actions: features(m.actions),
    bonusActions: features(m.bonusActions),
    reactions: features(m.reactions),
    legendaryActions: features(m.legendaryActions),
  }
}

// One line of the before / after comparison, e.g. ["Greatclub", "+6, 2d8+4", "+8, 5d8+4"].
export type Change = { label: string; before: string; after: string }

export function compareScaled(before: Monster, after: Monster): Change[] {
  const changes: Change[] = [
    { label: 'CR', before: `${formatCr(before.cr)} (${before.xp.toLocaleString()} XP)`, after: `${formatCr(after.cr)} (${after.xp.toLocaleString()} XP)` },
    { label: 'Armor Class', before: `${before.ac}`, after: `${after.ac}` },
    { label: 'Hit Points', before: `${before.hp} (${before.hitDice})`, after: `${after.hp} (${after.hitDice})` },
  ]
  if (before.saves) changes.push({ label: 'Saving Throws', before: before.saves, after: after.saves ?? '' })
  const lists = ['traits', 'actions', 'bonusActions', 'reactions', 'legendaryActions'] as const
  for (const list of lists) {
    before[list]?.forEach((f, i) => {
      const g = after[list]![i]
      const describe = (x: Feature) => [
        x.attack !== undefined && `${signed(x.attack)} to hit`,
        x.damage?.length && x.damage.map((d) => `${d.dice} ${d.type}`.trim()).join(' + '),
        x.dc && `DC ${x.dc.value}`,
        x.spellcasting?.dc !== undefined && `spell DC ${x.spellcasting.dc}`,
      ].filter(Boolean).join(', ')
      const text = describe(f)
      if (text) changes.push({ label: f.name, before: text, after: describe(g) })
    })
  }
  return changes
}
