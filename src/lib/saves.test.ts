// Tests for saving throws: monster bonuses, rolling against a DC, and damage after a save.

import { describe, expect, it } from 'vitest'
import { damageAfterSave, rollSave, saveBonus, toAbility } from './saves'

const dragon = { abilities: [27, 10, 25, 16, 13, 21], saves: 'Dex +6, Con +13, Wis +7, Cha +11' }

describe('saveBonus', () => {
  it('uses listed proficiencies, otherwise the ability modifier', () => {
    expect(saveBonus(dragon, 'Dex')).toBe(6)
    expect(saveBonus(dragon, 'Str')).toBe(8)   // 27 → +8
    expect(saveBonus({ abilities: [8, 14, 10, 10, 8, 8] }, 'Wis')).toBe(-1)
  })
})

describe('toAbility', () => {
  it('reads the spellings used in the data', () => {
    expect(toAbility('DEX')).toBe('Dex')
    expect(toAbility('wisdom')).toBe('Wis')
    expect(toAbility('nope')).toBeUndefined()
  })
})

describe('rollSave', () => {
  it('passes on meeting the DC', () => {
    const fixed = (d20: number) => () => (d20 - 1) / 20  // random value that rolls this number on a d20
    expect(rollSave(2, 15, 'normal', fixed(13))).toMatchObject({ total: 15, passed: true })
    expect(rollSave(2, 15, 'normal', fixed(12))).toMatchObject({ total: 14, passed: false })
  })
})

describe('damageAfterSave', () => {
  it('full on a fail, half (rounded down) or none on a success', () => {
    expect(damageAfterSave(27, false, 'half')).toBe(27)
    expect(damageAfterSave(27, true, 'half')).toBe(13)
    expect(damageAfterSave(27, true, 'none')).toBe(0)
  })
})
