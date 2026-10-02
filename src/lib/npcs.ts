// Saving NPCs, and adding an NPC with a stat block to the campaign's fight.
// Pure field logic (defaults, search) is in npcFields.ts.

import { db } from '../db'
import type { Npc } from '../types'
import { blankNpc } from './npcFields'
import { resolveMonster } from './encounters'
import { addMonstersToCombat } from './store'

// Adds an NPC to a campaign (blank, or with some fields filled in) and returns its id.
export async function createNpc(campaignId: string, fields: Partial<Npc> = {}): Promise<string> {
  const npc = { ...blankNpc(campaignId), ...fields }
  await db.npcs.add(npc)
  return npc.id
}

export function saveNpc(npc: Npc) {
  return db.npcs.put({ ...npc, updatedAt: Date.now() })
}

export async function duplicateNpc(npc: Npc): Promise<string> {
  const id = crypto.randomUUID()
  const now = Date.now()
  await db.npcs.add({ ...structuredClone(npc), id, name: `${npc.name} (copy)`, savedAt: now, updatedAt: now })
  return id
}

// Puts the NPC in their campaign's fight under their own name, using their stat block's HP, AC,
// initiative and actions. Returns false if the stat block no longer exists (e.g. deleted homebrew).
export async function addNpcToCombat(npc: Npc): Promise<boolean> {
  if (!npc.statBlock) return false
  const monster = await resolveMonster(npc.statBlock)
  if (!monster) return false
  await addMonstersToCombat(npc.campaignId, monster, 1, npc.statBlock.edition, npc.name.trim() || monster.name)
  return true
}

// Shrinks an image file to fit in a size × size square and returns it as a JPEG data URL,
// so portraits stay small in the database and in backups.
export async function resizeImage(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}
