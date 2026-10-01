// The app's database: IndexedDB (built into the browser) via the Dexie library.
// Each table below is like a SQL table. The schema strings list the primary key
// first, then any indexed columns (other columns don't need declaring).

import Dexie, { type Table } from 'dexie'
import type { Campaign, CombatState, Note, Pc } from './types'
import type { Npc } from './lib/generators'

// A combat saved in the database. Its id is the campaign's id, or 'quick' for Quick combat.
export type SavedCombat = CombatState & { id: string }

// A generated NPC that has been saved to a campaign, with the GM's own notes.
export type SavedNpc = Npc & { campaignId: string; notes: string; savedAt: number }

// The id of the single Quick combat slot.
export const QUICK_COMBAT = 'quick'

class GmDatabase extends Dexie {
  campaigns!: Table<Campaign, string>
  pcs!: Table<Pc, string>
  combats!: Table<SavedCombat, string>
  npcs!: Table<SavedNpc, string>
  notes!: Table<Note, string>

  constructor() {
    super('gm-companion')
    // Version 1 of the schema. Changing it later means adding a version(2) with the new layout.
    this.version(1).stores({
      campaigns: 'id, lastOpenedAt',  // PRIMARY KEY id, INDEX lastOpenedAt
      pcs: 'id, campaignId',
      combats: 'id',
      npcs: 'id, campaignId',
      notes: 'campaignId',
    })
  }
}

export const db = new GmDatabase()
