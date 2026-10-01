// Backing up campaigns to a file, and loading them back in.
// A backup is a JSON file holding each campaign plus everything linked to it.

import { db, QUICK_COMBAT, type SavedCombat, type SavedNpc } from '../db'
import type { Campaign, Note, Pc } from '../types'

const APP = 'gm-companion'
const VERSION = 1

type CampaignBackup = {
  campaign: Campaign
  pcs: Pc[]
  combat: SavedCombat | null
  npcs: SavedNpc[]
  notes: Note | null
}

export type Backup = {
  app: typeof APP
  version: number
  exportedAt: string
  campaigns: CampaignBackup[]
}

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
    })
  }
  return { app: APP, version: VERSION, exportedAt: new Date().toISOString(), campaigns: entries }
}

// Adds the campaigns in a backup as new copies (with new IDs), so nothing existing is overwritten.
// Returns how many campaigns were imported.
export async function importCampaigns(data: unknown): Promise<number> {
  const backup = data as Backup
  if (backup?.app !== APP || !Array.isArray(backup.campaigns)) throw new Error('This file is not a GM Companion backup.')
  if (backup.version > VERSION) throw new Error('This backup was made by a newer version of the app.')

  await db.transaction('rw', [db.campaigns, db.pcs, db.combats, db.npcs, db.notes], async () => {
    for (const entry of backup.campaigns) {
      const campaignId = crypto.randomUUID()
      // Old PC id → new PC id, so combatants still point at the right party member.
      const pcIds = new Map(entry.pcs.map((pc) => [pc.id, crypto.randomUUID()]))

      await db.campaigns.add({ ...entry.campaign, id: campaignId, lastOpenedAt: Date.now() })
      await db.pcs.bulkAdd(entry.pcs.map((pc) => ({ ...pc, id: pcIds.get(pc.id)!, campaignId })))
      await db.npcs.bulkAdd(entry.npcs.map((npc) => ({ ...npc, id: crypto.randomUUID(), campaignId })))
      if (entry.notes) await db.notes.add({ ...entry.notes, campaignId })
      if (entry.combat && entry.combat.id !== QUICK_COMBAT) {
        const combatants = entry.combat.combatants.map((c) => ({ ...c, pcId: c.pcId && pcIds.get(c.pcId) }))
        await db.combats.add({ ...entry.combat, id: campaignId, combatants })
      }
    }
  })
  return backup.campaigns.length
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
