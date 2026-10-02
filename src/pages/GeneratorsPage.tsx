// The Generators page. Inside a campaign, generated NPCs can be saved to it.

import { useLiveQuery } from 'dexie-react-hooks'
import { Generators } from '../components/Generators'
import { db } from '../db'
import { useApp, useCampaignRoute, useOpenInLookup } from '../lib/appContext'
import { generatedNpcId, npcFromGenerated } from '../lib/npcFields'

export function GeneratorsPage() {
  const { edition } = useApp()
  const { campaignId, base } = useCampaignRoute()
  const openInLookup = useOpenInLookup()
  // IDs of the NPCs already saved to this campaign (like SELECT id FROM npcs WHERE campaignId = ...).
  const savedIds = useLiveQuery(
    () => (campaignId ? db.npcs.where('campaignId').equals(campaignId).primaryKeys() : []),
    [campaignId],
  )

  return (
    <Generators
      edition={edition}
      onOpenItem={(index) => openInLookup('magic-items', index)}
      onSaveNpc={campaignId ? (npc) => db.npcs.put(npcFromGenerated(npc, campaignId)) : undefined}
      isNpcSaved={(npc) => (campaignId && savedIds?.includes(generatedNpcId(npc, campaignId))) || false}
      savedNpcLink={(npc) => `${base}/npcs/${encodeURIComponent(generatedNpcId(npc, campaignId!))}`}
    />
  )
}
