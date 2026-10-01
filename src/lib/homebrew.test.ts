// Tests for homebrew monsters and spells.

import { describe, expect, it } from 'vitest'
import type { Spell } from '../data/srd'
import { blankSpell, homebrewToSpell, matchesEdition, spellListMarkdown, spellToHomebrew, stripUsageLabel, usageLabel, withSpellList } from './homebrew'

describe('matchesEdition', () => {
  it('shows "both" in every edition and tagged entries only in theirs', () => {
    expect(matchesEdition('both', '2014')).toBe(true)
    expect(matchesEdition('2024', '2024')).toBe(true)
    expect(matchesEdition('2024', '2014')).toBe(false)
  })
})

describe('homebrewToSpell', () => {
  it('builds slot damage from base + per level', () => {
    const spell = homebrewToSpell({ ...blankSpell('both'), level: 3, damageDice: '8d6', damagePerLevel: '1d6' })
    expect(spell.damageBySlot).toMatchObject({ 3: '8d6', 4: '9d6', 9: '14d6' })
    expect(spell.homebrew).toBe(true)
  })

  it('scales cantrips at caster levels 5, 11 and 17', () => {
    const spell = homebrewToSpell({ ...blankSpell('both'), level: 0, damageDice: '1d10' })
    expect(spell.damageByLevel).toEqual({ 1: '1d10', 5: '2d10', 11: '3d10', 17: '4d10' })
  })

  it('keeps the ability modifier on healing', () => {
    const spell = homebrewToSpell({ ...blankSpell('both'), level: 1, healDice: '1d8 + MOD', healPerLevel: '1d8' })
    expect(spell.healBySlot?.[2]).toBe('2d8 + MOD')
  })

  it('ignores damage that is not valid dice', () => {
    expect(homebrewToSpell({ ...blankSpell('both'), damageDice: 'lots' }).damageBySlot).toBeUndefined()
    // Invalid per-level dice (e.g. half-typed) are ignored rather than crashing.
    expect(homebrewToSpell({ ...blankSpell('both'), level: 1, damageDice: '2d6', damagePerLevel: '1d' }).damageBySlot?.[2]).toBe('2d6')
  })
})

describe('spellToHomebrew', () => {
  it('works out base and per-level dice from an SRD spell', () => {
    const fireball = { index: 'fireball', name: 'Fireball', level: 3, damageBySlot: { 3: '8d6', 4: '9d6', 5: '10d6' } } as unknown as Spell
    const copy = spellToHomebrew(fireball, '2014')
    expect(copy).toMatchObject({ damageDice: '8d6', damagePerLevel: '1d6', edition: '2014', homebrew: true })
    expect(copy.index).toMatch(/^hb-/)
    // And back again gives the same table.
    expect(homebrewToSpell(copy).damageBySlot?.[5]).toBe('10d6')
  })
})

describe('usage labels', () => {
  it('adds and removes the suffix', () => {
    expect(usageLabel({ type: 'recharge', min: 5 })).toBe('Recharge 5–6')
    expect(stripUsageLabel('Fire Breath (Recharge 5–6)')).toBe('Fire Breath')
    expect(stripUsageLabel('Legendary Resistance (3/Day, or 4/Day in Lair)')).toBe('Legendary Resistance')
    expect(stripUsageLabel('Bite')).toBe('Bite')
  })
})

describe('spell list text', () => {
  it('groups spells and replaces an old list', () => {
    const list = spellListMarkdown([
      { index: 'a', name: 'Fly', level: 3, usage: 1 },
      { index: 'b', name: 'Light', level: 0, usage: 'atWill' },
      { index: 'c', name: 'Haste', level: 3, usage: 1 },
    ])
    expect(list).toBe('- **At Will:** Light\n- **1/Day Each:** Fly, Haste')
    expect(withSpellList('Casts spells:\n\n- **At Will:** Old', list)).toBe(`Casts spells:\n\n${list}`)
  })
})
