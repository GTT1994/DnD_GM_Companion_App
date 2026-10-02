// NPC fields with no database access: the drop-down choices, filling in missing fields
// (for NPCs saved by older versions), converting a generated NPC, and searching the list.

import type { Npc, NpcAttitude, NpcStatus } from '../types'
import type { Npc as GeneratedNpc } from './generators'

// The species drop-down. Anything else can be typed in with "Custom…".
export const SPECIES = [
  'Aasimar', 'Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Half-Elf', 'Half-Orc', 'Halfling', 'Human', 'Orc', 'Tiefling',
]

export const GENDERS = ['Female', 'Male', 'Non-binary']  // suggestions; any text is allowed

export const ATTITUDES: Record<NpcAttitude, string> = { friendly: 'Friendly', indifferent: 'Indifferent', hostile: 'Hostile' }
export const STATUSES: Record<NpcStatus, string> = { alive: 'Alive', dead: 'Dead', missing: 'Missing', unknown: 'Unknown' }

// An NPC with every field present. Older records (and old backups) are missing the newer
// fields and use "ancestry"/"occupation"; like COALESCE(column, default) for each one.
export function normaliseNpc(old: Partial<Npc> & { ancestry?: string; occupation?: string }): Npc {
  const savedAt = old.savedAt ?? Date.now()
  return {
    id: old.id ?? crypto.randomUUID(),
    campaignId: old.campaignId ?? '',
    name: old.name ?? '',
    species: old.species ?? old.ancestry ?? '',
    gender: old.gender ?? '',
    role: old.role ?? old.occupation ?? '',
    location: old.location ?? '',
    faction: old.faction ?? '',
    attitude: old.attitude ?? 'indifferent',
    status: old.status ?? 'alive',
    appearance: old.appearance ?? '',
    personality: old.personality ?? '',
    mannerism: old.mannerism ?? '',
    motivation: old.motivation ?? '',
    secret: old.secret ?? '',
    notes: old.notes ?? '',
    ...(old.portrait ? { portrait: old.portrait } : {}),
    ...(old.statBlock ? { statBlock: old.statBlock } : {}),
    savedAt,
    updatedAt: old.updatedAt ?? savedAt,
  }
}

// A blank NPC for "+ New NPC".
export function blankNpc(campaignId: string): Npc {
  return normaliseNpc({ id: crypto.randomUUID(), campaignId, name: 'New NPC' })
}

// A generated NPC saved to a campaign. The id combines the two, so the same NPC can be saved to two campaigns.
export function npcFromGenerated(npc: GeneratedNpc, campaignId: string): Npc {
  return normaliseNpc({
    id: generatedNpcId(npc, campaignId),
    campaignId,
    name: npc.name,
    species: npc.ancestry,
    role: npc.occupation,
    appearance: npc.appearance,
    personality: npc.personality,
    mannerism: npc.mannerism,
    motivation: npc.motivation,
    secret: npc.secret,
  })
}

export const generatedNpcId = (npc: GeneratedNpc, campaignId: string) => `${campaignId}:${npc.id}`

export type NpcFilter = { search: string; attitude: NpcAttitude | 'all'; status: NpcStatus | 'all' }

// Like WHERE (name LIKE '%x%' OR role LIKE '%x%' ...) AND attitude = ? AND status = ? ORDER BY name.
export function filterNpcs(npcs: Npc[], { search, attitude, status }: NpcFilter): Npc[] {
  const text = search.trim().toLowerCase()
  return npcs
    .filter((n) => attitude === 'all' || n.attitude === attitude)
    .filter((n) => status === 'all' || n.status === status)
    .filter((n) => !text || [n.name, n.species, n.role, n.location, n.faction, n.notes].some((f) => f.toLowerCase().includes(text)))
    .sort((a, b) => a.name.localeCompare(b.name))
}
