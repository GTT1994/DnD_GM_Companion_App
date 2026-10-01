// Tests for encounter difficulty and loading encounters into combat.

import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import type { Monster } from '../data/srd'
import type { EncounterMonster } from '../types'
import { difficulty2014, difficulty2024, loadEncounter, multiplier2014, startingHp } from './encounters'
import { applyCombatAction, createCampaign, getCombat } from './store'

const goblin = (count: number): EncounterMonster => ({ edition: '2014', index: 'goblin', name: 'Goblin', count, xp: 50, cr: 0.25 })

describe('2014 difficulty', () => {
  it('uses the multiplier for the number of monsters, shifted for small and large parties', () => {
    expect(multiplier2014(1, 4)).toBe(1)
    expect(multiplier2014(2, 4)).toBe(1.5)
    expect(multiplier2014(4, 4)).toBe(2)
    expect(multiplier2014(15, 4)).toBe(4)
    expect(multiplier2014(1, 2)).toBe(1.5)   // small party: one step up
    expect(multiplier2014(1, 6)).toBe(0.5)   // large party: one step down
  })

  it('compares adjusted XP with the party thresholds', () => {
    // Four level 3 PCs: Easy 300, Medium 600, Hard 900, Deadly 1600.
    // Six goblins: 300 XP × 2 = 600 adjusted → Medium.
    const d = difficulty2014([3, 3, 3, 3], [goblin(6)])
    expect(d).toMatchObject({ xp: 300, compareXp: 600, multiplier: 2, rating: 'Medium' })
    expect(d.thresholds.map((t) => t.xp)).toEqual([300, 600, 900, 1600])
    expect(difficulty2014([3, 3, 3, 3], [goblin(1)]).rating).toBe('Trivial')
  })
})

describe('2024 difficulty', () => {
  it('compares total XP with the party budgets', () => {
    // Four level 3 PCs: Low 600, Moderate 900, High 1600.
    expect(difficulty2024([3, 3, 3, 3], [goblin(6)])).toMatchObject({ xp: 300, rating: 'Low' })
    expect(difficulty2024([3, 3, 3, 3], [goblin(15)]).rating).toBe('Moderate')
    expect(difficulty2024([3, 3, 3, 3], [goblin(40)]).rating).toBe('Beyond High')
    // Leaving a PC out lowers the budgets.
    expect(difficulty2024([3, 3, 3], [goblin(15)]).rating).toBe('High')
  })
})

const goblinMonster = { index: 'goblin', name: 'Goblin', hp: 7, hitDice: '2d6', ac: 15, abilities: [8, 14, 10, 10, 8, 8] } as Monster

describe('startingHp', () => {
  it('uses the average or rolls the hit dice', () => {
    expect(startingHp(goblinMonster, 'average')).toBe(7)
    expect(startingHp(goblinMonster, 'roll', () => 0)).toBe(2)
  })
})

describe('loadEncounter', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('gives each group one initiative, and replaces or adds to existing monsters', async () => {
    const campaignId = await createCampaign('Test', '')
    const encounter = {
      id: 'e1', campaignId, name: 'Ambush', notes: '', status: 'planned' as const, hpMode: 'average' as const,
      monsters: [goblin(3)], updatedAt: 0,
    }
    await db.encounters.add(encounter)
    // A PC and an old monster already in the fight.
    await applyCombatAction(campaignId, { type: 'add', combatants: [
      { id: 'pc', name: 'Thorin', hp: 30, maxHp: 30, tempHp: 0, ac: 18, initiative: 10, isPlayer: true, conditions: [] },
      { id: 'old', name: 'Wolf', hp: 11, maxHp: 11, tempHp: 0, ac: 13, initiative: 12, isPlayer: false, conditions: [] },
    ] })

    await loadEncounter(encounter, [{ ref: goblin(3), monster: goblinMonster }], 'replace')
    let fight = (await getCombat(campaignId)).combatants
    expect(fight.map((c) => c.name)).toEqual(['Thorin', 'Goblin', 'Goblin 2', 'Goblin 3'])
    expect(new Set(fight.filter((c) => !c.isPlayer).map((c) => c.initiative)).size).toBe(1)  // shared roll
    expect((await db.encounters.get('e1'))?.status).toBe('used')

    await loadEncounter(encounter, [{ ref: goblin(1), monster: goblinMonster }], 'add')
    fight = (await getCombat(campaignId)).combatants
    expect(fight.map((c) => c.name)).toContain('Goblin 4')
  })
})
