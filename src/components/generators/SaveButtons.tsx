// Buttons on generated results for keeping them in the current campaign: add to this session's
// plan or the campaign notes, or save a generated person as an NPC. Outside a campaign there's
// nowhere to save, so they don't show.

import { useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { useCampaignRoute } from '../../lib/appContext'
import { addToNotes, addToPlan } from '../../lib/sessions'
import { generatedNpcId, npcFromGenerated } from '../../lib/npcFields'
import type { Saveable } from '../../lib/generatorNotes'
import type { Npc } from '../../lib/generators'

// "Add to session plan" and "Add to campaign notes", each showing ✓ once done.
export function SaveToCampaign({ saveable }: { saveable: Saveable }) {
  const { campaignId } = useCampaignRoute()
  const [done, setDone] = useState<{ plan?: boolean; notes?: boolean }>({})
  if (!campaignId) return null
  return (
    <>
      <button type="button" className="small" disabled={done.plan} onClick={async () => {
        await addToPlan(campaignId, saveable.plan.section, saveable.plan.blocks)
        setDone((d) => ({ ...d, plan: true }))
      }}>
        {done.plan ? 'In session plan ✓' : 'Add to session plan'}
      </button>
      <button type="button" className="small" disabled={done.notes} onClick={async () => {
        await addToNotes(campaignId, saveable.notes)
        setDone((d) => ({ ...d, notes: true }))
      }}>
        {done.notes ? 'In campaign notes ✓' : 'Add to campaign notes'}
      </button>
    </>
  )
}

// "Save as NPC" for a generated person; once saved, a link to their NPC page.
export function SaveNpcButton({ npc, label = 'Save to campaign' }: { npc: Npc; label?: string }) {
  const { campaignId, base } = useCampaignRoute()
  const id = campaignId ? generatedNpcId(npc, campaignId) : ''
  // Like SELECT COUNT(*) FROM npcs WHERE id = ...: is this one already saved?
  const saved = useLiveQuery(async () => (id ? (await db.npcs.get(id)) !== undefined : false), [id])
  if (!campaignId) return null
  return saved
    ? <span className="notice">Saved ✓ <Link to={`${base}/npcs/${encodeURIComponent(id)}`}>Open</Link></span>
    : <button type="button" className="small" onClick={() => db.npcs.put(npcFromGenerated(npc, campaignId))}>{label}</button>
}
