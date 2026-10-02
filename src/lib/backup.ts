// Backing up campaigns to a file, and loading them back in.
// A backup is a JSON file holding each campaign plus everything linked to it, and/or homebrew.

import { db, QUICK_COMBAT, type HomebrewMonster, type HomebrewSpell, type SavedCombat, type SavedNpc } from '../db'
import type { Campaign, Encounter, Note, Pc } from '../types'
import { normaliseNpc } from './npcFields'

const APP = 'gm-companion'
const VERSION = 1

type CampaignBackup = {
  campaign: Campaign
  pcs: Pc[]
  combat: SavedCombat | null
  npcs: SavedNpc[]
  notes: Note | null
  encounters?: Encounter[]  // missing in backups made before encounters existed
}

export type Backup = {
  app: typeof APP
  version: number
  exportedAt: string
  campaigns: CampaignBackup[]
  homebrew?: { monsters: HomebrewMonster[]; spells: HomebrewSpell[] }
}

export type ImportResult = { campaigns: number; monsters: number; spells: number }

// Collects the given campaigns (or all of them) into a backup object.
export async function exportCampaigns(ids?: string[]): Promise<Backup> {
  const campaigns = ids ? (await db.campaigns.bulkGet(ids)).filter((c) => c !== undefined) : await db.campaigns.toArray()
  const entries: CampaignBackup[] = []
  for (const campaign of campaigns) {
    entries.push({
      campaign,
      pcs: await db.pcs.where('campaignId').equals(campaign.id).toArray(),
      combat: (await db.combats.get(campaign.id)) ?? null,
      npcs: await db.npcs.where('campaignId').equals(campaign.id).toArray(),
      notes: (await db.notes.get(campaign.id)) ?? null,
      encounters: await db.encounters.where('campaignId').equals(campaign.id).toArray(),
    })
  }
  const backup: Backup = { app: APP, version: VERSION, exportedAt: new Date().toISOString(), campaigns: entries }
  // "Export all" (no ids given) includes the whole homebrew library; a single campaign
  // brings along just the homebrew monsters in its fight, and the homebrew spells they cast.
  if (!ids) {
    backup.homebrew = await homebrewEntries()
  } else {
    // Homebrew monsters in the campaign's fight, its encounters, or used as NPC stat blocks.
    const monsterIndexes = entries
      .flatMap((e) => [...(e.combat?.combatants.map((c) => c.monster?.index) ?? []), ...(e.encounters ?? []).flatMap((enc) => enc.monsters.map((m) => m.index)), ...e.npcs.map((n) => n.statBlock?.index)])
      .filter((i) => i?.startsWith('hb-'))
    const monsters = (await db.homebrewMonsters.bulkGet(monsterIndexes as string[])).filter((m) => m !== undefined)
    const spellIndexes = monsters.flatMap((m) => spellIndexesOf(m)).filter((i) => i.startsWith('hb-'))
    const spells = (await db.homebrewSpells.bulkGet(spellIndexes)).filter((s) => s !== undefined)
    if (monsters.length) backup.homebrew = { monsters: unique(monsters), spells: unique(spells) }
  }
  return backup
}

const SECTIONS = ['traits', 'actions', 'bonusActions', 'reactions', 'legendaryActions'] as const

// The indexes of every spell a monster can cast.
function spellIndexesOf(m: HomebrewMonster): string[] {
  return SECTIONS.flatMap((section) => m[section] ?? []).flatMap((f) => f.spellcasting?.spells.map((s) => s.index) ?? [])
}

// Removes repeats (the same entry listed twice), keeping the first.
function unique<T extends { index: string }>(list: T[]): T[] {
  return [...new Map(list.map((x) => [x.index, x])).values()]
}

// The whole homebrew library on its own, for sharing creations.
export async function exportHomebrew(): Promise<Backup> {
  return { app: APP, version: VERSION, exportedAt: new Date().toISOString(), campaigns: [], homebrew: await homebrewEntries() }
}

async function homebrewEntries() {
  return { monsters: await db.homebrewMonsters.toArray(), spells: await db.homebrewSpells.toArray() }
}

// Adds the campaigns and homebrew in a backup as new copies (with new IDs), so nothing existing
// is overwritten. Returns how many of each were imported.
export async function importCampaigns(data: unknown): Promise<ImportResult> {
  const backup = data as Backup
  if (backup?.app !== APP || !Array.isArray(backup.campaigns)) throw new Error('This file is not a GM Companion backup.')
  if (backup.version > VERSION) throw new Error('This backup was made by a newer version of the app.')

  const tables = [db.campaigns, db.pcs, db.combats, db.npcs, db.notes, db.homebrewMonsters, db.homebrewSpells, db.encounters]
  const result: ImportResult = { campaigns: backup.campaigns.length, monsters: 0, spells: 0 }
  await db.transaction('rw', tables, async () => {
    // For each homebrew entry in the file: unchanged ones already here are skipped; ones missing here
    // (e.g. deleted) come back with their original index; ones that have been edited here are added as copies.
    // Old index → index to use, so monsters' spells and fights still point at the right entries.
    const monsterIds = new Map<string, string>()
    const spellIds = new Map<string, string>()
    const newSpells = []
    const newMonsters = []
    const newHbIndex = () => `hb-${crypto.randomUUID()}`
    for (const s of backup.homebrew?.spells ?? []) {
      const here = await db.homebrewSpells.get(s.index)
      if (here?.updatedAt === s.updatedAt) continue
      spellIds.set(s.index, here ? newHbIndex() : s.index)
      newSpells.push(s)
    }
    for (const m of backup.homebrew?.monsters ?? []) {
      const here = await db.homebrewMonsters.get(m.index)
      if (here?.updatedAt === m.updatedAt) continue
      monsterIds.set(m.index, here ? newHbIndex() : m.index)
      newMonsters.push(m)
    }
    result.monsters = newMonsters.length
    result.spells = newSpells.length

    await db.homebrewSpells.bulkAdd(newSpells.map((s) => ({ ...s, index: spellIds.get(s.index)! })))
    await db.homebrewMonsters.bulkAdd(newMonsters.map((m) => ({
      ...m,
      index: monsterIds.get(m.index)!,
      // Point spellcasting at the imported copies of any homebrew spells.
      ...Object.fromEntries(SECTIONS.map((section) => [
        section,
        m[section]?.map((f) => (f.spellcasting
          ? { ...f, spellcasting: { ...f.spellcasting, spells: f.spellcasting.spells.map((s) => ({ ...s, index: spellIds.get(s.index) ?? s.index })) } }
          : f)),
      ])),
    })))

    for (const entry of backup.campaigns) {
      const campaignId = crypto.randomUUID()
      // Old PC id → new PC id, so combatants still point at the right party member.
      const pcIds = new Map(entry.pcs.map((pc) => [pc.id, crypto.randomUUID()]))

      await db.campaigns.add({ ...entry.campaign, id: campaignId, lastOpenedAt: Date.now() })
      await db.pcs.bulkAdd(entry.pcs.map((pc) => ({ ...pc, id: pcIds.get(pc.id)!, campaignId })))
      // Older backups have NPCs without the newer fields; their stat blocks point at the imported homebrew copies.
      await db.npcs.bulkAdd(entry.npcs.map((old) => {
        const npc = normaliseNpc(old)
        const statBlock = npc.statBlock && { ...npc.statBlock, index: monsterIds.get(npc.statBlock.index) ?? npc.statBlock.index }
        return { ...npc, id: crypto.randomUUID(), campaignId, ...(statBlock ? { statBlock } : {}) }
      }))
      if (entry.notes) await db.notes.add({ ...entry.notes, campaignId })
      await db.encounters.bulkAdd((entry.encounters ?? []).map((enc) => ({
        ...enc,
        id: crypto.randomUUID(),
        campaignId,
        monsters: enc.monsters.map((m) => ({ ...m, index: monsterIds.get(m.index) ?? m.index })),
      })))
      if (entry.combat && entry.combat.id !== QUICK_COMBAT) {
        const combatants = entry.combat.combatants.map((c) => ({
          ...c,
          pcId: c.pcId && pcIds.get(c.pcId),
          // Homebrew monsters in the fight point at their imported copies.
          monster: c.monster && { ...c.monster, index: monsterIds.get(c.monster.index) ?? c.monster.index },
        }))
        await db.combats.add({ ...entry.combat, id: campaignId, combatants })
      }
    }
  })
  return result
}

// Makes the browser download a backup as a .json file.
export function downloadBackup(backup: Backup, name: string) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${name.replace(/[^\w-]+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

// e.g. "1 campaign, 2 homebrew monsters and 1 homebrew spell".
export function describeImport(result: ImportResult): string {
  if (!result.campaigns && !result.monsters && !result.spells) return 'nothing new (everything in the file is already here)'
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const parts = [
    result.campaigns ? plural(result.campaigns, 'campaign') : '',
    result.monsters ? plural(result.monsters, 'homebrew monster') : '',
    result.spells ? plural(result.spells, 'homebrew spell') : '',
  ].filter(Boolean)
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
}
