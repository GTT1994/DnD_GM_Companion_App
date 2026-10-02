// Tests the database upgrade to version 4: NPCs saved by older versions get the custom NPC fields.
// Kept in its own file so the database starts out at the old version.

import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { expect, it } from 'vitest'
import { db } from './db'

it('upgrades NPCs saved at version 3', async () => {
  // Create the database as version 3 of the app left it, with a generated NPC saved.
  const old = new Dexie('gm-companion')
  old.version(3).stores({ campaigns: 'id, lastOpenedAt', pcs: 'id, campaignId', combats: 'id', npcs: 'id, campaignId', notes: 'campaignId', homebrewMonsters: 'index, name', homebrewSpells: 'index, name', encounters: 'id, campaignId' })
  await old.table('npcs').add({ id: 'n1', campaignId: 'c1', name: 'Bryn Hale', ancestry: 'Human', occupation: 'Blacksmith', appearance: 'Scarred', personality: '', mannerism: '', motivation: '', secret: '', notes: 'Owes money', savedAt: 10 })
  old.close()

  // Opening the current database runs the upgrade.
  const npc = await db.npcs.get('n1')
  expect(npc).toMatchObject({ name: 'Bryn Hale', species: 'Human', role: 'Blacksmith', appearance: 'Scarred', notes: 'Owes money', attitude: 'indifferent', status: 'alive', updatedAt: 10 })
  expect(npc).not.toHaveProperty('ancestry')
  expect(npc).not.toHaveProperty('occupation')
})
