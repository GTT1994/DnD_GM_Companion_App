// Tests for rolling monster actions and spells.

import { describe, expect, it } from 'vitest'
import type { Spell, Spellcasting } from '../data/srd'
import { rollDice } from './dice'
import {
  availableSlotLevels, concentrationDc, defaultIncluded, rollToHit, slotKey, spellAttackBonus, spellDamageDice, spellHealDice,
} from './actions'

// A fake random source that returns the given values in order.
const sequence = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('rollToHit', () => {
  it('keeps the higher d20 with advantage and the lower with disadvantage', () => {
    // 0.5 → 11, 0.95 → 20
    expect(rollToHit(4, 'advantage', sequence(0.5, 0.95))).toMatchObject({ rolls: [11, 20], natural: 20, total: 24 })
    expect(rollToHit(4, 'disadvantage', sequence(0.5, 0.95))).toMatchObject({ natural: 11, total: 15 })
    expect(rollToHit(4, 'normal', sequence(0.5)).rolls).toHaveLength(1)
  })
})

describe('critical hits', () => {
  it('doubles the dice but not the modifier', () => {
    const crit = rollDice('1d6+2', { crit: true, random: () => 0 })
    expect(crit).toEqual({ total: 4, rolls: [1, 1], modifier: 2 })
  })

  it('handles flat damage', () => {
    expect(rollDice('1', { crit: true }).total).toBe(1)
  })
})

describe('defaultIncluded', () => {
  it('leaves conditional extra damage unticked', () => {
    const desc = 'Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Slashing damage, plus 2 (1d4) Slashing damage if the attack roll had Advantage.'
    expect(defaultIncluded(desc, [{ dice: '1d6+2', type: 'Slashing' }, { dice: '1d4', type: 'Slashing' }])).toEqual([true, false])
  })

  it('ticks unconditional extra damage', () => {
    const desc = 'Melee Weapon Attack: +6 to hit. Hit: 8 (1d8 + 4) slashing damage plus 7 (2d6) fire damage.'
    expect(defaultIncluded(desc, [{ dice: '1d8+4', type: 'Slashing' }, { dice: '2d6', type: 'Fire' }])).toEqual([true, true])
  })

  it('leaves save-based extra damage unticked', () => {
    const desc = 'Hit: 7 (1d8 + 3) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 9 (2d8) poison damage on a failed save.'
    expect(defaultIncluded(desc, [{ dice: '1d8+3', type: 'Piercing' }, { dice: '2d8', type: 'Poison' }])).toEqual([true, false])
  })

  it('ticks only the first of a choice', () => {
    const parts = [
      { dice: '1d6', type: 'Bludgeoning', alternative: true },
      { dice: '1d8', type: 'Bludgeoning', alternative: true },
    ]
    expect(defaultIncluded('', parts)).toEqual([true, false])
  })
})

const fireball = { level: 3, damageBySlot: { 3: '8d6', 4: '9d6', 5: '10d6' } } as unknown as Spell
const fireBolt = { level: 0, damageByLevel: { 1: '1d10', 5: '2d10', 11: '3d10', 17: '4d10' } } as unknown as Spell
const archmage: Spellcasting = { dc: 17, attack: 9, level: 18, slots: { 1: 4, 3: 3, 5: 1 }, spells: [] }

describe('spells', () => {
  it('scales damage with the slot level', () => {
    expect(spellDamageDice(fireball, 3)).toBe('8d6')
    expect(spellDamageDice(fireball, 5)).toBe('10d6')
  })

  it('scales cantrips with caster level', () => {
    expect(spellDamageDice(fireBolt, 0, 18)).toBe('4d10')
    expect(spellDamageDice(fireBolt, 0, 7)).toBe('2d10')
    expect(spellDamageDice(fireBolt, 0)).toBe('1d10')
  })

  it('uses the given spell attack bonus, or DC − 8', () => {
    expect(spellAttackBonus(archmage)).toBe(9)
    expect(spellAttackBonus({ dc: 17, spells: [] })).toBe(9)
  })

  it('fills in the ability modifier for healing', () => {
    const cure = { level: 1, healBySlot: { 1: '1d8 + MOD', 2: '2d8 + MOD' } } as unknown as Spell
    expect(spellHealDice(cure, 2, 3)).toBe('2d8+3')
  })

  it('offers only slot levels with slots left, at or above the spell level', () => {
    expect(availableSlotLevels(archmage, {}, 3)).toEqual([3, 5])
    expect(availableSlotLevels(archmage, { [slotKey(3)]: 3 }, 3)).toEqual([5])
  })
})

describe('concentrationDc', () => {
  it('is 10 or half the damage, whichever is higher', () => {
    expect(concentrationDc(7)).toBe(10)
    expect(concentrationDc(31)).toBe(15)
  })
})
