// A campaign's saved NPCs, each with a notes box for the GM.

import { useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SavedNpc } from '../db'
import { useCampaignRoute } from '../lib/appContext'

export function NpcsPage() {
  const { campaignId, base } = useCampaignRoute()
  // Newest first.
  const npcs = useLiveQuery(
    async () => (await db.npcs.where('campaignId').equals(campaignId!).sortBy('savedAt')).reverse(),
    [campaignId],
  )

  if (!npcs) return <p className="empty">Loading…</p>

  return (
    <section className="page">
      <div className="section-header">
        <h2>NPCs</h2>
        <Link to={`${base}/generators`} className="button primary">Generate NPCs</Link>
      </div>
      {npcs.length === 0 && (
        <p className="empty">No saved NPCs yet. Generate some, then use <strong>Save to campaign</strong> on the ones you want to keep.</p>
      )}
      <div className="npc-grid">
        {npcs.map((npc) => <NpcCard key={npc.id} npc={npc} />)}
      </div>
    </section>
  )
}

function NpcCard({ npc }: { npc: SavedNpc }) {
  const [notes, setNotes] = useState(npc.notes)

  return (
    <article className="card">
      <div className="card-actions">
        <button
          type="button"
          className="remove"
          aria-label={`Delete ${npc.name}`}
          onClick={() => confirm(`Delete ${npc.name}?`) && db.npcs.delete(npc.id)}
        >
          ✕
        </button>
      </div>
      <h3>{npc.name}</h3>
      <p className="meta">{npc.ancestry} {npc.occupation}</p>
      <ul>
        <li><strong>Looks:</strong> {npc.appearance}</li>
        <li><strong>Personality:</strong> {npc.personality}</li>
        <li><strong>Mannerism:</strong> {npc.mannerism}</li>
        <li><strong>Wants to:</strong> {npc.motivation}</li>
        <li><strong>Secret:</strong> {npc.secret}</li>
      </ul>
      {/* Saved when the box loses focus */}
      <textarea
        className="npc-notes"
        placeholder="Notes: where the party met them, what they know…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes !== npc.notes && db.npcs.update(npc.id, { notes })}
      />
    </article>
  )
}
