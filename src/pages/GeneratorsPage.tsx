// The Generators page. Inside a campaign, generated NPCs can be saved to it.

import { useLiveQuery } from 'dexie-react-hooks'
import { Generators } from '../components/Generators'
import { db } from '../db'
import { useApp, useCampaignRoute, useOpenInLookup } from '../lib/appContext'
import type { Npc } from '../lib/generators'

export function GeneratorsPage() {
  const { edition } = useApp()
  const { campaignId } = useCampaignRoute()
  const openInLookup = useOpenInLookup()
  // IDs of the NPCs already saved to this campaign (like SELECT id FROM npcs WHERE campaignId = ...).
  const savedIds = useLiveQuery(
    () => (campaignId ? db.npcs.where('campaignId').equals(campaignId).primaryKeys() : []),
    [campaignId],
  )

  // A saved NPC's id combines the campaign and the generated NPC, so the same NPC can be saved to two campaigns.
  const savedId = (npc: Npc) => `${campaignId}:${npc.id}`

  return (
    <Generators
      edition={edition}
      onOpenItem={(index) => openInLookup('magic-items', index)}
      onSaveNpc={campaignId ? (npc) => db.npcs.put({ ...npc, id: savedId(npc), campaignId, notes: '', savedAt: Date.now() }) : undefined}
      isNpcSaved={(npc) => savedIds?.includes(savedId(npc)) ?? false}
    />
  )
}
