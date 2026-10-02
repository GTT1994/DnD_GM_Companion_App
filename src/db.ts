// The app's database: IndexedDB (built into the browser) via the Dexie library.
// Each table below is like a SQL table. The schema strings list the primary key
// first, then any indexed columns (other columns don't need declaring).

import Dexie, { type Table } from 'dexie'
import type { Campaign, CombatState, Edition, Encounter, Note, Npc, Pc } from './types'
import type { Monster, Spell } from './data/srd'
import { normaliseNpc } from './lib/npcFields'

// A combat saved in the database. Its id is the campaign's id, or 'quick' for Quick combat.
export type SavedCombat = CombatState & { id: string }

// A campaign's NPC (see Npc in types.ts).
export type SavedNpc = Npc

// Which rules edition a homebrew entry shows up in.
export type HomebrewEdition = Edition | 'both'

// A homebrew monster: the same fields as an SRD monster, plus its edition tag. Its index starts "hb-".
export type HomebrewMonster = Monster & { edition: HomebrewEdition; updatedAt: number }

// A homebrew spell. Damage and healing are entered as base dice plus extra dice per slot level;
// the app turns those into the same per-level tables the SRD spells have.
export type HomebrewSpell = Spell & {
  edition: HomebrewEdition
  updatedAt: number
  damageDice?: string      // e.g. "8d6" at the spell's own level
  damagePerLevel?: string  // e.g. "1d6" extra for each slot level above
  healDice?: string        // may include "+ MOD" for the caster's ability modifier
  healPerLevel?: string
}

// The id of the single Quick combat slot.
export const QUICK_COMBAT = 'quick'

class GmDatabase extends Dexie {
  campaigns!: Table<Campaign, string>
  pcs!: Table<Pc, string>
  combats!: Table<SavedCombat, string>
  npcs!: Table<SavedNpc, string>
  notes!: Table<Note, string>
  homebrewMonsters!: Table<HomebrewMonster, string>
  homebrewSpells!: Table<HomebrewSpell, string>
  encounters!: Table<Encounter, string>

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
    // Version 2 adds the shared homebrew library. Existing data is kept as it is.
    this.version(2).stores({
      homebrewMonsters: 'index, name',
      homebrewSpells: 'index, name',
    })
    // Version 3 adds prepared encounters, linked to a campaign.
    this.version(3).stores({
      encounters: 'id, campaignId',
    })
    // Version 4 adds the custom NPC fields. NPCs saved from the generator get them filled in
    // (ancestry becomes species, occupation becomes role), like an UPDATE run during the upgrade.
    this.version(4).stores({
      npcs: 'id, campaignId',
    }).upgrade((tx) => tx.table('npcs').toCollection().modify((npc) => {
      Object.assign(npc, normaliseNpc(npc))
      delete npc.ancestry
      delete npc.occupation
    }))
  }
}

export const db = new GmDatabase()
