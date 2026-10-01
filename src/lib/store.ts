// Reading and writing app data in the database. Pages call these functions rather than
// touching the tables directly, so rules like "PC HP carries over" live in one place.
// Each function that writes to several tables uses a transaction (all-or-nothing, like BEGIN TRAN ... COMMIT).

import { db, QUICK_COMBAT, type SavedCombat } from '../db'
import type { Campaign, Combatant, Edition, Pc } from '../types'
import type { Monster } from '../data/srd'
import { combatReducer, emptyCombat, uniqueName, type CombatAction } from './combat'
import { abilityMod, rollDie } from './dice'

// --- Campaigns ---------------------------------------------------------------

export async function createCampaign(name: string, description: string): Promise<string> {
  const now = Date.now()
  const id = crypto.randomUUID()
  await db.campaigns.add({ id, name, description, createdAt: now, lastOpenedAt: now })
  return id
}

export function updateCampaign(id: string, changes: Partial<Pick<Campaign, 'name' | 'description'>>) {
  return db.campaigns.update(id, changes)
}

// Records when a campaign was last opened, so the home page can list recent ones first.
export function touchCampaign(id: string) {
  return db.campaigns.update(id, { lastOpenedAt: Date.now() })
}

// Deletes a campaign and everything that belongs to it, like ON DELETE CASCADE.
export function deleteCampaign(id: string) {
  return db.transaction('rw', [db.campaigns, db.pcs, db.combats, db.npcs, db.notes], async () => {
    await db.pcs.where('campaignId').equals(id).delete()
    await db.npcs.where('campaignId').equals(id).delete()
    await db.combats.delete(id)
    await db.notes.delete(id)
    await db.campaigns.delete(id)
  })
}

// --- Combat --------------------------------------------------------------------

// Reads a combat, or an empty one if it hasn't been started.
export async function getCombat(id: string): Promise<SavedCombat> {
  return (await db.combats.get(id)) ?? { id, ...emptyCombat }
}

// Applies a tracker action to a saved combat, and copies any PC HP changes back to the party.
export function applyCombatAction(combatId: string, action: CombatAction) {
  return db.transaction('rw', [db.combats, db.pcs], async () => {
    const next = combatReducer(await getCombat(combatId), action)
    await db.combats.put({ ...next, id: combatId })
    // Keep each party member's HP in step with their combatant.
    for (const c of next.combatants) {
      if (c.pcId) await db.pcs.update(c.pcId, { currentHp: c.hp, tempHp: c.tempHp })
    }
  })
}

// Adds SRD monsters to a combat, each rolling its own initiative (d20 + Dex modifier).
export function addMonstersToCombat(combatId: string, monster: Monster, count: number, edition: Edition) {
  return db.transaction('rw', [db.combats, db.pcs], async () => {
    const existing = (await getCombat(combatId)).combatants
    const added: Combatant[] = []
    for (let i = 0; i < count; i++) {
      added.push({
        id: crypto.randomUUID(),
        name: uniqueName(monster.name, [...existing, ...added]),
        initiative: rollDie(20) + abilityMod(monster.abilities[1]),
        hp: monster.hp,
        maxHp: monster.hp,
        tempHp: 0,
        ac: monster.ac,
        isPlayer: false,
        conditions: [],
        monster: { edition, index: monster.index },
      })
    }
    await applyCombatAction(combatId, { type: 'add', combatants: added })
  })
}

// Adds every party member who isn't already in the campaign's fight, at their current HP.
// Initiative is rolled as a placeholder; type each player's real roll into the tracker.
export function addPartyToCombat(campaignId: string) {
  return db.transaction('rw', [db.combats, db.pcs], async () => {
    const inFight = new Set((await getCombat(campaignId)).combatants.map((c) => c.pcId))
    const pcs = await db.pcs.where('campaignId').equals(campaignId).sortBy('name')
    const added: Combatant[] = pcs
      .filter((pc) => !inFight.has(pc.id))
      .map((pc) => ({
        id: crypto.randomUUID(),
        name: pc.name,
        initiative: rollDie(20),
        hp: pc.currentHp,
        maxHp: pc.maxHp,
        tempHp: pc.tempHp,
        ac: pc.ac,
        isPlayer: true,
        conditions: [],
        pcId: pc.id,
      }))
    if (added.length) await applyCombatAction(campaignId, { type: 'add', combatants: added })
    return added.length
  })
}

// --- Party -----------------------------------------------------------------------

export type PcFields = Omit<Pc, 'id' | 'campaignId' | 'currentHp' | 'tempHp'>

export function addPc(campaignId: string, fields: PcFields) {
  return db.pcs.add({ ...fields, id: crypto.randomUUID(), campaignId, currentHp: fields.maxHp, tempHp: 0 })
}

// Saves edits to a PC, and updates their combatant (if they're in the fight) to match.
export function updatePc(pc: Pc, fields: PcFields) {
  return db.transaction('rw', [db.combats, db.pcs], async () => {
    const currentHp = Math.min(pc.currentHp, fields.maxHp)  // lowering max HP can lower current HP
    await db.pcs.update(pc.id, { ...fields, currentHp })
    const combat = await getCombat(pc.campaignId)
    if (combat.combatants.some((c) => c.pcId === pc.id)) {
      const combatants = combat.combatants.map((c) =>
        c.pcId === pc.id ? { ...c, name: fields.name, ac: fields.ac, maxHp: fields.maxHp, hp: currentHp } : c)
      await db.combats.put({ ...combat, combatants })
    }
  })
}

export function deletePc(id: string) {
  return db.pcs.delete(id)
}

// Long rest: every PC back to full HP with no temp HP, in the party and in the fight.
export function longRest(campaignId: string) {
  return db.transaction('rw', [db.combats, db.pcs], async () => {
    const pcs = await db.pcs.where('campaignId').equals(campaignId).toArray()
    for (const pc of pcs) await db.pcs.update(pc.id, { currentHp: pc.maxHp, tempHp: 0 })
    const combat = await getCombat(campaignId)
    const combatants = combat.combatants.map((c) => (c.pcId ? { ...c, hp: c.maxHp, tempHp: 0 } : c))
    await db.combats.put({ ...combat, combatants })
  })
}

// --- Moving old data across ------------------------------------------------------

// Before campaigns existed, the one combat was saved in localStorage. Move it into
// the Quick combat slot the first time the new version runs, then remove the old copy.
export async function migrateLegacyStorage() {
  const OLD_COMBAT = 'gm-companion:combat'
  const text = localStorage.getItem(OLD_COMBAT)
  if (text !== null) {
    if (!(await db.combats.get(QUICK_COMBAT))) {
      try {
        await db.combats.put({ ...emptyCombat, ...JSON.parse(text), id: QUICK_COMBAT })
      } catch {
        // Unreadable old data: nothing worth keeping.
      }
    }
    localStorage.removeItem(OLD_COMBAT)
  }
  localStorage.removeItem('gm-companion:page')  // replaced by page addresses
}
