// A campaign's free-text notes page. Saves automatically shortly after you stop typing.

import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useCampaignRoute } from '../lib/appContext'

export function NotesPage() {
  const { campaignId } = useCampaignRoute()
  // null when the campaign has no notes yet.
  const note = useLiveQuery(async () => (await db.notes.get(campaignId!)) ?? null, [campaignId])

  if (note === undefined) return <p className="empty">Loading…</p>
  // The editor starts from the saved text, then keeps its own copy while you type.
  return <NotesEditor key={campaignId} campaignId={campaignId!} initialText={note?.text ?? ''} />
}

function NotesEditor({ campaignId, initialText }: { campaignId: string; initialText: string }) {
  const [text, setText] = useState(initialText)
  const [saved, setSaved] = useState(true)

  // Save half a second after the last keystroke, rather than on every key press.
  useEffect(() => {
    if (saved) return
    const timer = setTimeout(async () => {
      await db.notes.put({ campaignId, text, updatedAt: Date.now() })
      setSaved(true)
    }, 500)
    return () => clearTimeout(timer)  // a new keystroke cancels the pending save
  }, [text, saved, campaignId])

  return (
    <section className="page">
      <div className="section-header">
        <h2>Notes</h2>
        <span className="meta">{saved ? 'Saved' : 'Saving…'}</span>
      </div>
      <textarea
        className="notes"
        value={text}
        placeholder="Plot threads, places, names to remember… (a full lore wiki is coming later)"
        onChange={(e) => {
          setText(e.target.value)
          setSaved(false)
        }}
      />
    </section>
  )
}
