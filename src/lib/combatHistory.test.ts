// Tests for the names on the Undo / Redo buttons, and Undo / Redo against the saved fight.

import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import type { CombatState } from '../types'
import { describeAction } from './combatHistory'
import { addPartyToCombat, addPc, applyCombatAction, createCampaign, getCombat } from './store'

const fight: CombatState = {
  combatants: [{ id: 'g', name: 'Goblin', hp: 7, maxHp: 7, tempHp: 0, ac: 15, initiative: 12, isPlayer: false, conditions: ['Prone'] }],
  round: 0,
  activeId: null,
}

describe('describeAction', () => {
  it('names changes in plain words', () => {
    expect(describeAction({ type: 'damage', id: 'g', amount: 8 }, fight)).toBe('8 damage to Goblin')
    expect(describeAction({ type: 'toggleCondition', id: 'g', condition: 'Prone' }, fight)).toBe('remove Prone from Goblin')
    expect(describeAction({ type: 'nextTurn' }, fight)).toBe('start combat')
    expect(describeAction({ type: 'batch', label: 'group save', actions: [] }, fight)).toBe('group save')
  })

  it("doesn't keep rolls or dismissed notices for undo", () => {
    expect(describeAction({ type: 'log', entry: { id: 'x', text: 'roll' } }, fight)).toBeNull()
    expect(describeAction({ type: 'clearNotices' }, fight)).toBeNull()
  })
})

describe('undoing against the database', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it("restoring the earlier fight also puts back the PC's party HP", async () => {
    const campaignId = await createCampaign('Test', '')
    const pcId = await addPc(campaignId, {
      name: 'Thorin', playerName: '', className: '', level: 1, ac: 16, maxHp: 30, passivePerception: 10, passiveInsight: 10, passiveInvestigation: 10,
    })
    await addPartyToCombat(campaignId)
    const id = (await getCombat(campaignId)).combatants[0].id
    const before = await applyCombatAction(campaignId, { type: 'damage', id, amount: 12 })
    expect((await db.pcs.get(pcId))?.currentHp).toBe(18)
    await applyCombatAction(campaignId, { type: 'restore', state: before })
    expect((await getCombat(campaignId)).combatants[0].hp).toBe(30)
    expect((await db.pcs.get(pcId))?.currentHp).toBe(30)
  })
})
