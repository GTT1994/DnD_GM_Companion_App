// Tests for resistances, immunities and vulnerabilities: reading stat block text, gathering a
// combatant's defences, and the damage maths.

import { describe, expect, it } from 'vitest'
import type { Combatant } from '../types'
import { adjustDamage, adjustmentLabel, adjustParts, combatantDefenses, defenseTags, parseDefenses } from './resistances'

const make = (fields: Partial<Combatant> = {}): Combatant =>
  ({ id: 'x', name: 'X', hp: 50, maxHp: 50, tempHp: 0, ac: 10, initiative: 10, isPlayer: false, conditions: [], ...fields })

describe('parseDefenses', () => {
  it('reads a simple list (2024 style)', () => {
    expect(parseDefenses('cold, fire', 'resistant').rules).toEqual([{ kind: 'resistant', type: 'cold' }, { kind: 'resistant', type: 'fire' }])
  })

  it('applies "from nonmagical weapons" to the physical types only', () => {
    const { rules, notes } = parseDefenses('lightning, thunder, bludgeoning, piercing, and slashing from nonmagical weapons', 'resistant')
    expect(rules).toEqual([
      { kind: 'resistant', type: 'bludgeoning', nonmagicalOnly: true },
      { kind: 'resistant', type: 'lightning' },
      { kind: 'resistant', type: 'piercing', nonmagicalOnly: true },
      { kind: 'resistant', type: 'slashing', nonmagicalOnly: true },
      { kind: 'resistant', type: 'thunder' },
    ])
    expect(notes).toEqual([])
  })

  it('notes silvered weapons and other conditions it cannot check', () => {
    expect(parseDefenses('bludgeoning, piercing, and slashing from nonmagical weapons that aren\'t silvered', 'immune').notes).toHaveLength(1)
    const odd = parseDefenses('piercing from magic weapons wielded by good creatures', 'vulnerable')
    expect(odd.rules).toEqual([])
    expect(odd.notes[0].text).toMatch(/good creatures/)
    expect(parseDefenses('damage type chosen for the draconic origin trait below', 'resistant').notes).toHaveLength(1)
  })
})

describe('combatantDefenses', () => {
  it('combines the stat block, the PC sheet and temporary conditions', () => {
    const d = combatantDefenses(
      make({ conditions: ['Resistant: Cold', 'Prone'], pcDefenses: { resistant: ['Fire'], immune: [], vulnerable: [] } }),
      { immunities: 'poison', vulnerabilities: 'radiant', conditionImmunities: 'Charmed, Frightened' },
    )
    expect(d.rules).toEqual([
      { kind: 'immune', type: 'poison' },
      { kind: 'vulnerable', type: 'radiant' },
      { kind: 'resistant', type: 'fire' },
      { kind: 'resistant', type: 'cold' },
    ])
    expect(d.conditionImmunities).toEqual(['Charmed', 'Frightened'])
  })
})

describe('adjustDamage', () => {
  const golem = combatantDefenses(make(), {
    resistances: 'fire', immunities: 'poison, bludgeoning, piercing, and slashing from nonmagical weapons', vulnerabilities: 'fire, cold',
  })

  it('halves (rounded down), doubles, and zeroes', () => {
    expect(adjustDamage(13, golem, 'Cold').amount).toBe(26)
    expect(adjustDamage(13, golem, 'Poison')).toMatchObject({ amount: 0 })
    expect(adjustDamage(13, golem, 'Fire').amount).toBe(12)   // resistant and vulnerable: half, then double
    expect(adjustDamage(13, golem, 'Acid').amount).toBe(13)
    expect(adjustDamage(13, golem, undefined).amount).toBe(13)  // untyped
  })

  it('nonmagical-only immunity is skipped for magical attacks', () => {
    expect(adjustDamage(9, golem, 'Slashing').amount).toBe(0)
    expect(adjustDamage(9, golem, 'Slashing', true).amount).toBe(9)
  })

  it('works out each part of mixed damage, and half on a successful save', () => {
    const elemental = combatantDefenses(make(), { immunities: 'fire' })
    expect(adjustParts([{ total: 7, type: 'Slashing' }, { total: 9, type: 'Fire' }], elemental).amount).toBe(7)
    expect(adjustParts([{ total: 28, type: 'Fire' }], combatantDefenses(make(), { resistances: 'fire' }), { half: true }).amount).toBe(7)
  })

  it('labels the adjustment', () => {
    expect(adjustmentLabel(adjustDamage(10, golem, 'Cold').kinds, 'Cold')).toBe('×2 cold')
    expect(adjustmentLabel(adjustDamage(10, golem, 'Poison').kinds, 'Poison')).toBe('immune')
    expect(adjustmentLabel(adjustDamage(10, golem, 'Acid').kinds, 'Acid')).toBe('')
  })
})

describe('defenseTags', () => {
  it('summarises each kind, marking nonmagical-only types and notes', () => {
    const d = combatantDefenses(make(), { resistances: 'cold, bludgeoning from nonmagical attacks', vulnerabilities: 'piercing from magic weapons wielded by good creatures' })
    expect(defenseTags(d).map((t) => t.text)).toEqual(['Res bludgeoning*, cold', 'Vuln ⚠'])
  })
})
