// A campaign's session log: past sessions (saved by "End session" on the Overview), newest first,
// and each session's own page, where the details, recap and plan can be edited.

import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Session } from '../types'
import { useCampaignRoute } from '../lib/appContext'
import { docToText } from '../lib/richText'
import { deleteSession, saveSession } from '../lib/sessions'
import { useAutosave } from '../lib/useAutosave'
import { RichEditor } from '../components/RichEditor'

export function SessionsPage() {
  const { campaignId, base } = useCampaignRoute()
  // Like ORDER BY number DESC.
  const sessions = useLiveQuery(
    async () => (await db.sessions.where('campaignId').equals(campaignId!).sortBy('number')).reverse(),
    [campaignId],
  )
  if (!sessions) return <p className="empty">Loading…</p>

  return (
    <section className="page">
      <div className="section-header">
        <h2>Sessions</h2>
        <Link to={base} className="button">Plan the next session</Link>
      </div>
      {sessions.length === 0 ? (
        <p className="empty">No sessions logged yet. Plan a session on the <Link to={base}>Overview</Link>, then press <strong>End session</strong> to save it here.</p>
      ) : (
        <table className="data-table sessions-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Title</th>
              <th>Recap</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const recap = docToText(s.recap)
              return (
                <tr key={s.id}>
                  <td className="session-number">{s.number}</td>
                  <td className="session-date">{formatDate(s.date)}</td>
                  <td className="name-cell"><Link to={`${base}/sessions/${s.id}`}>{s.title || `Session ${s.number}`}</Link></td>
                  <td className="meta">{recap.length > 120 ? `${recap.slice(0, 120)}…` : recap}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}

// e.g. "Fri 2 Oct 2026".
function formatDate(date: string): string {
  const d = new Date(`${date}T00:00`)
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function SessionPage() {
  const { sessionId } = useParams()
  const { base } = useCampaignRoute()
  // undefined while loading, null if there's no such session.
  const session = useLiveQuery(async () => (await db.sessions.get(sessionId!)) ?? null, [sessionId])
  if (session === undefined) return <p className="empty">Loading…</p>
  if (session === null) return <p className="empty">This session doesn't exist. <Link to={`${base}/sessions`}>Back to sessions</Link></p>
  return <SessionEditor key={session.id} initial={session} />
}

function SessionEditor({ initial }: { initial: Session }) {
  const { base } = useCampaignRoute()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(initial)
  const autosave = useAutosave(saveSession)

  const latest = useRef(initial)  // the newest draft, so quick edits in both editors build on each other

  const update = (changes: Partial<Session>) => {
    const next = { ...latest.current, ...changes }
    latest.current = next
    setDraft(next)
    autosave.change(next)
  }

  return (
    <section className="page">
      <div className="section-header">
        <h2>Session {draft.number}{draft.title && `: ${draft.title}`}</h2>
        <span className="meta">{autosave.saved ? 'Saved' : 'Saving…'}</span>
        <div className="toolbar-buttons">
          <Link to={`${base}/sessions`}>← Sessions</Link>
          <button
            type="button"
            className="small danger"
            onClick={async () => {
              if (!confirm(`Delete session ${draft.number}?`)) return
              autosave.cancel()
              await deleteSession(draft.id)
              navigate(`${base}/sessions`)
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="end-session-fields session-fields">
        <label>
          Session
          <input type="number" min={1} className="tiny-input" value={draft.number} onChange={(e) => parseInt(e.target.value) > 0 && update({ number: parseInt(e.target.value) })} />
        </label>
        <label>
          Date
          <input type="date" value={draft.date} onChange={(e) => update({ date: e.target.value })} />
        </label>
        <label className="grow">
          Title
          <input value={draft.title} onChange={(e) => update({ title: e.target.value })} />
        </label>
      </div>

      <div className="session-columns">
        <section className="notes-section">
          <h3>Recap</h3>
          <RichEditor initial={initial.recap} label="Recap" placeholder="What happened?" minHeight="12rem" onChange={(recap) => update({ recap })} />
        </section>
        <section className="notes-section">
          <h3>Plan</h3>
          <RichEditor initial={initial.plan} label="Plan" minHeight="12rem" onChange={(plan) => update({ plan })} />
        </section>
      </div>
    </section>
  )
}
