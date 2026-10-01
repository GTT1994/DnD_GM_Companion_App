// Tests for the database operations, run against an in-memory copy of IndexedDB.

import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, QUICK_COMBAT } from '../db'
import {
  addPartyToCombat, addPc, applyCombatAction, createCampaign, deleteCampaign, getCombat, longRest,
  migrateLegacyStorage, updatePc, type PcFields,
} from './store'
import { exportCampaigns, exportHomebrew, importCampaigns } from './backup'
import { blankMonster, blankSpell } from './homebrew'

const thorin: PcFields = {
  name: 'Thorin', playerName: 'Sam', className: 'Fighter', level: 5, ac: 18, maxHp: 44,
  passivePerception: 13, passiveInsight: 11, passiveInvestigation: 10,
}

// Empty every table before each test.
beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

// Creates a campaign with Thorin in the party and in the fight; returns the IDs.
async function campaignWithThorinInFight() {
  const campaignId = await createCampaign('Curse of the Test', '')
  const pcId = await addPc(campaignId, thorin)
  await addPartyToCombat(campaignId)
  const combatantId = (await getCombat(campaignId)).combatants[0].id
  return { campaignId, pcId, combatantId }
}

describe('party HP carry-over', () => {
  it('adds the party to the fight at their current HP, only once', async () => {
    const { campaignId, pcId } = await campaignWithThorinInFight()
    expect(await addPartyToCombat(campaignId)).toBe(0)  // already in the fight
    const [combatant] = (await getCombat(campaignId)).combatants
    expect(combatant).toMatchObject({ name: 'Thorin', hp: 44, isPlayer: true, pcId })
  })

  it('copies damage taken in combat back to the PC', async () => {
    const { campaignId, pcId, combatantId } = await campaignWithThorinInFight()
    await applyCombatAction(campaignId, { type: 'damage', id: combatantId, amount: 10 })
    expect((await db.pcs.get(pcId))?.currentHp).toBe(34)
  })

  it('starts the next fight at the HP the PC was left on', async () => {
    const { campaignId, combatantId } = await campaignWithThorinInFight()
    await applyCombatAction(campaignId, { type: 'damage', id: combatantId, amount: 10 })
    await applyCombatAction(campaignId, { type: 'clearAll' })
    await addPartyToCombat(campaignId)
    expect((await getCombat(campaignId)).combatants[0].hp).toBe(34)
  })

  it('heals everyone on a long rest, in the party and the fight', async () => {
    const { campaignId, pcId, combatantId } = await campaignWithThorinInFight()
    await applyCombatAction(campaignId, { type: 'damage', id: combatantId, amount: 30 })
    await longRest(campaignId)
    expect((await db.pcs.get(pcId))?.currentHp).toBe(44)
    expect((await getCombat(campaignId)).combatants[0].hp).toBe(44)
  })

  it('updates the combatant when the PC is edited', async () => {
    const { campaignId, pcId } = await campaignWithThorinInFight()
    await updatePc((await db.pcs.get(pcId))!, { ...thorin, name: 'Thorin II', maxHp: 30 })
    expect((await getCombat(campaignId)).combatants[0]).toMatchObject({ name: 'Thorin II', maxHp: 30, hp: 30 })
  })
})

describe('campaigns', () => {
  it('deletes a campaign and everything linked to it', async () => {
    const { campaignId } = await campaignWithThorinInFight()
    await db.notes.put({ campaignId, text: 'secret', updatedAt: 0 })
    await db.encounters.add({ id: 'e1', campaignId, name: 'Ambush', notes: '', status: 'planned', hpMode: 'average', monsters: [], updatedAt: 0 })
    await deleteCampaign(campaignId)
    expect(await db.encounters.count()).toBe(0)
    expect(await db.campaigns.count()).toBe(0)
    expect(await db.pcs.count()).toBe(0)
    expect(await db.combats.count()).toBe(0)
    expect(await db.notes.count()).toBe(0)
  })
})

describe('backups', () => {
  it('imports a campaign as a new copy with its links intact', async () => {
    const { campaignId } = await campaignWithThorinInFight()
    await db.notes.put({ campaignId, text: 'The butler did it', updatedAt: 0 })
    await db.encounters.add({ id: 'e1', campaignId, name: 'Ambush', notes: '', status: 'planned', hpMode: 'average', monsters: [], updatedAt: 0 })
    // Round-trip through JSON text, as a real file would.
    const file = JSON.parse(JSON.stringify(await exportCampaigns([campaignId])))

    expect(await importCampaigns(file)).toEqual({ campaigns: 1, monsters: 0, spells: 0 })
    const copy = (await db.campaigns.toArray()).find((c) => c.id !== campaignId)!
    const copyPc = await db.pcs.where('campaignId').equals(copy.id).first()
    const copyCombat = await getCombat(copy.id)
    expect(copy.name).toBe('Curse of the Test')
    expect(copyCombat.combatants[0].pcId).toBe(copyPc?.id)  // points at the copied PC, not the original
    expect((await db.notes.get(copy.id))?.text).toBe('The butler did it')
    expect((await db.encounters.where('campaignId').equals(copy.id).first())?.name).toBe('Ambush')
  })

  it('imports homebrew as copies and re-links spells and fights to them', async () => {
    const spell = { ...blankSpell('both'), name: 'Hex Bolt' }
    const monster = blankMonster('both')
    monster.name = 'Hexer'
    monster.actions = [{ name: 'Spellcasting', desc: '', spellcasting: { dc: 13, spells: [{ index: spell.index, name: 'Hex Bolt', level: 1, usage: 'atWill' }] } }]
    await db.homebrewSpells.add(spell)
    await db.homebrewMonsters.add(monster)

    const file = JSON.parse(JSON.stringify(await exportHomebrew()))
    // Unchanged entries already in this browser aren't copied again.
    expect(await importCampaigns(file)).toEqual({ campaigns: 0, monsters: 0, spells: 0 })
    // After editing, importing the old file adds copies.
    await db.homebrewSpells.update(spell.index, { updatedAt: 1 })
    await db.homebrewMonsters.update(monster.index, { updatedAt: 1 })
    expect(await importCampaigns(file)).toEqual({ campaigns: 0, monsters: 1, spells: 1 })
    const copySpell = (await db.homebrewSpells.toArray()).find((s) => s.index !== spell.index)!
    const copyMonster = (await db.homebrewMonsters.toArray()).find((m) => m.index !== monster.index)!
    expect(copyMonster.actions?.[0].spellcasting?.spells[0].index).toBe(copySpell.index)
  })

  it('restores deleted homebrew with its original index, so links still work', async () => {
    const spell = { ...blankSpell('both'), name: 'Hex Bolt' }
    await db.homebrewSpells.add(spell)
    const file = JSON.parse(JSON.stringify(await exportHomebrew()))
    await db.homebrewSpells.delete(spell.index)
    expect(await importCampaigns(file)).toEqual({ campaigns: 0, monsters: 0, spells: 1 })
    expect((await db.homebrewSpells.get(spell.index))?.name).toBe('Hex Bolt')
  })

  it('rejects files that are not backups', async () => {
    await expect(importCampaigns({ hello: 'world' })).rejects.toThrow('not a GM Companion backup')
  })
})

describe('migrateLegacyStorage', () => {
  it('moves the old saved combat into Quick combat', async () => {
    const store = new Map([['gm-companion:combat', JSON.stringify({ combatants: [], round: 3, activeId: null })]])
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      removeItem: (k: string) => store.delete(k),
    } as unknown as Storage

    await migrateLegacyStorage()
    expect((await getCombat(QUICK_COMBAT)).round).toBe(3)
    expect(store.has('gm-companion:combat')).toBe(false)
  })
})
