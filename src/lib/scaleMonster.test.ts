// Tests for scaling a monster to a new CR.

import { describe, expect, it } from 'vitest'
import type { Monster } from '../data/srd'
import { averageOf, compareScaled, scaleDamageDice, scaleHitDice, scaleMonster, scaleSteps } from './scaleMonster'

const ogre: Monster = {
  index: 'ogre', name: 'Ogre', meta: 'Large, giant, chaotic evil', ac: 11, acNote: 'Hide Armor', hp: 59, hitDice: '7d10+21', speed: '40 ft.',
  abilities: [19, 8, 16, 5, 7, 7], senses: 'darkvision 60 ft., passive Perception 8', cr: 2, xp: 450,
  actions: [{
    name: 'Greatclub',
    desc: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.',
    attack: 6,
    damage: [{ dice: '2d8+4', type: 'Bludgeoning' }],
  }],
}

describe('scaleSteps', () => {
  it('compares two rows of the DMG table', () => {
    const steps = scaleSteps(2, 5)
    expect(steps).toMatchObject({ ac: 2, attack: 3, dc: 2, prof: 1 })
    expect(steps.hpRatio).toBeCloseTo(138 / 93)
    expect(steps.damageRatio).toBeCloseTo(35.5 / 17.5)
  })
})

describe('dice helpers', () => {
  it('averages dice like stat blocks', () => {
    expect(averageOf('2d8+4')).toBe(13)
    expect(averageOf('1d6+2')).toBe(5)
  })

  it('scales damage dice but keeps the modifier', () => {
    expect(scaleDamageDice('1d6+2', 2.5)).toBe('3d6+2')
    expect(scaleDamageDice('2d8+4', 0.4)).toBe('1d8+4')
    expect(scaleDamageDice('1', 3)).toBe('3')
  })

  it('keeps the die size and Con bonus per die for hit points', () => {
    expect(scaleHitDice('7d10+21', 88)).toEqual({ hp: 85, hitDice: '10d10+30' })
    expect(scaleHitDice('2d6', 1)).toEqual({ hp: 3, hitDice: '1d6' })
  })
})

describe('scaleMonster', () => {
  const scaled = scaleMonster(ogre, 5)

  it('moves AC, attack and HP, and renames it', () => {
    expect(scaled).toMatchObject({ name: 'Ogre (CR 5)', cr: 5, xp: 1800, ac: 13 })
    expect(scaled.hp).toBeGreaterThan(80)
    expect(scaled.actions![0].attack).toBe(9)
    expect(scaled.actions![0].damage![0].dice).toBe('4d8+4')
  })

  it('updates the numbers in the action text', () => {
    expect(scaled.actions![0].desc).toBe('Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 22 (4d8 + 4) bludgeoning damage.')
  })

  it('moves save DCs, saves, skills and passive Perception', () => {
    const scout: Monster = {
      ...ogre, saves: 'Dex +4', skills: 'Perception +5, Stealth +6', senses: 'passive Perception 15',
      actions: [{ name: 'Breath', desc: 'Each creature must make a DC 13 Dexterity saving throw.', dc: { ability: 'DEX', value: 13, success: 'half' } }],
    }
    const s = scaleMonster(scout, 9)
    expect(s.saves).toBe('Dex +6')
    expect(s.skills).toBe('Perception +7, Stealth +8')
    expect(s.senses).toBe('passive Perception 17')
    expect(s.actions![0].dc!.value).toBe(16)
    expect(s.actions![0].desc).toContain('DC 16')
  })

  it('scales down and renames an already-scaled copy', () => {
    const smaller = scaleMonster(scaled, 0.5)
    expect(smaller.name).toBe('Ogre (CR 1/2)')
    expect(smaller.actions![0].attack).toBe(6)
  })

  it('lists the changes', () => {
    const changes = compareScaled(ogre, scaled)
    expect(changes.find((c) => c.label === 'Greatclub')).toEqual({ label: 'Greatclub', before: '+6 to hit, 2d8+4 Bludgeoning', after: '+9 to hit, 4d8+4 Bludgeoning' })
    expect(changes.find((c) => c.label === 'Armor Class')).toEqual({ label: 'Armor Class', before: '11', after: '13' })
  })
})
