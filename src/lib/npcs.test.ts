// Tests for NPCs: filling in old records, generated NPCs, search and filters, adding an
// NPC to combat with their stat block, and NPCs in backups.

import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { createCampaign, deleteCampaign, getCombat } from './store'
import { exportCampaigns, importCampaigns } from './backup'
import { blankMonster } from './homebrew'
import { filterNpcs, normaliseNpc, npcFromGenerated } from './npcFields'
import { addNpcToCombat, createNpc, duplicateNpc } from './npcs'
import { generateNpc } from './generators'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('normaliseNpc', () => {
  it('turns an NPC saved before custom NPCs into the new shape', () => {
    const npc = normaliseNpc({ id: 'a', campaignId: 'c', name: 'Bryn Hale', ancestry: 'Human', occupation: 'Blacksmith', notes: 'Owes money', savedAt: 5 })
    expect(npc).toMatchObject({ species: 'Human', role: 'Blacksmith', gender: '', attitude: 'indifferent', status: 'alive', notes: 'Owes money', updatedAt: 5 })
    expect(npc).not.toHaveProperty('ancestry')
  })

  it('keeps the newer fields when they are there', () => {
    const npc = normaliseNpc({ id: 'a', species: 'Kenku', attitude: 'hostile', statBlock: { edition: '2024', index: 'spy', name: 'Spy' } })
    expect(npc.species).toBe('Kenku')
    expect(npc.attitude).toBe('hostile')
    expect(npc.statBlock?.index).toBe('spy')
  })
})

describe('npcFromGenerated', () => {
  it('copies the generated details into the NPC fields', () => {
    const generated = generateNpc('Dwarf', () => 0)
    const npc = npcFromGenerated(generated, 'camp')
    expect(npc.id).toBe(`camp:${generated.id}`)
    expect(npc.species).toBe('Dwarf')
    expect(npc.role).toBe(generated.occupation)
    expect(npc.secret).toBe(generated.secret)
  })
})

describe('filterNpcs', () => {
  const npcs = [
    normaliseNpc({ name: 'Vex', role: 'Cult leader', attitude: 'hostile' }),
    normaliseNpc({ name: 'Anna', location: 'Phandalin', attitude: 'friendly' }),
    normaliseNpc({ name: 'Bram', notes: 'Knows the way to **Phandalin**', status: 'dead' }),
  ]
  const names = (list: typeof npcs) => list.map((n) => n.name)

  it('sorts by name when nothing is filtered', () => {
    expect(names(filterNpcs(npcs, { search: '', attitude: 'all', status: 'all' }))).toEqual(['Anna', 'Bram', 'Vex'])
  })

  it('searches the location and notes, ignoring case', () => {
    expect(names(filterNpcs(npcs, { search: 'phandalin', attitude: 'all', status: 'all' }))).toEqual(['Anna', 'Bram'])
  })

  it('filters by attitude and status', () => {
    expect(names(filterNpcs(npcs, { search: '', attitude: 'hostile', status: 'all' }))).toEqual(['Vex'])
    expect(names(filterNpcs(npcs, { search: 'phandalin', attitude: 'all', status: 'alive' }))).toEqual(['Anna'])
  })
})

describe('saving NPCs', () => {
  it('creates, duplicates and deletes with the campaign', async () => {
    const campaignId = await createCampaign('Test', '')
    const id = await createNpc(campaignId)
    await db.npcs.update(id, { name: 'Vex' })
    const copyId = await duplicateNpc((await db.npcs.get(id))!)
    expect((await db.npcs.get(copyId))?.name).toBe('Vex (copy)')
    await deleteCampaign(campaignId)
    expect(await db.npcs.count()).toBe(0)
  })
})

describe('addNpcToCombat', () => {
  it("adds the NPC under their own name with the stat block's HP and AC", async () => {
    const campaignId = await createCampaign('Test', '')
    const npc = normaliseNpc({ campaignId, name: 'Captain Vex', statBlock: { edition: '2014', index: 'bandit-captain', name: 'Bandit Captain' } })
    expect(await addNpcToCombat(npc)).toBe(true)
    expect(await addNpcToCombat(npc)).toBe(true)
    const combatants = (await getCombat(campaignId)).combatants
    expect(combatants.map((c) => c.name)).toEqual(['Captain Vex', 'Captain Vex 2'])
    expect(combatants[0]).toMatchObject({ hp: 65, maxHp: 65, ac: 15, isPlayer: false, monster: { edition: '2014', index: 'bandit-captain' } })
  })

  it('returns false when there is no stat block, or it has been deleted', async () => {
    const campaignId = await createCampaign('Test', '')
    expect(await addNpcToCombat(normaliseNpc({ campaignId }))).toBe(false)
    expect(await addNpcToCombat(normaliseNpc({ campaignId, statBlock: { edition: '2024', index: 'hb-gone', name: 'Gone' } }))).toBe(false)
    expect((await getCombat(campaignId)).combatants).toEqual([])
  })
})

describe('NPCs in backups', () => {
  it('fills in old NPCs from an older backup file', async () => {
    const result = await importCampaigns({
      app: 'gm-companion', version: 1, exportedAt: '', campaigns: [{
        campaign: { id: 'old', name: 'Old', description: '', createdAt: 1, lastOpenedAt: 1 },
        pcs: [], combat: null, notes: null,
        npcs: [{ id: 'x', campaignId: 'old', name: 'Bryn', ancestry: 'Elf', occupation: 'Sage', appearance: '', personality: '', mannerism: '', motivation: '', secret: '', notes: '', savedAt: 1 }],
      }],
    })
    expect(result.campaigns).toBe(1)
    const [npc] = await db.npcs.toArray()
    expect(npc).toMatchObject({ name: 'Bryn', species: 'Elf', role: 'Sage', status: 'alive' })
    expect(npc.campaignId).not.toBe('old')
  })

  it('brings a homebrew stat block along with the campaign and keeps the link', async () => {
    const campaignId = await createCampaign('Test', '')
    await db.homebrewMonsters.add({ ...blankMonster('2024'), index: 'hb-warlord', name: 'Warlord', updatedAt: 1 })
    await db.npcs.add(normaliseNpc({ campaignId, name: 'Vex', portrait: 'data:image/jpeg;base64,AAAA', statBlock: { edition: '2024', index: 'hb-warlord', name: 'Warlord' } }))
    const backup = await exportCampaigns([campaignId])
    expect(backup.homebrew?.monsters.map((m) => m.index)).toEqual(['hb-warlord'])

    // Import into an empty app: the monster and NPC come back, still linked, with the portrait.
    await Promise.all(db.tables.map((t) => t.clear()))
    await importCampaigns(JSON.parse(JSON.stringify(backup)))
    const [npc] = await db.npcs.toArray()
    expect(npc.portrait).toBe('data:image/jpeg;base64,AAAA')
    expect(await db.homebrewMonsters.get(npc.statBlock!.index)).toBeDefined()
  })
})
