// The home page: open or create a campaign, jump into Quick combat, and back up or restore data.

import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, QUICK_COMBAT } from '../db'
import type { Campaign } from '../types'
import { createCampaign, deleteCampaign, getCombat } from '../lib/store'
import { describeImport, downloadBackup, exportCampaigns, importCampaigns } from '../lib/backup'

export function Home() {
  // Most recently opened first, like ORDER BY lastOpenedAt DESC.
  const campaigns = useLiveQuery(() => db.campaigns.orderBy('lastOpenedAt').reverse().toArray())
  // Number of PCs per campaign, like SELECT campaignId, COUNT(*) FROM pcs GROUP BY campaignId.
  const partySizes = useLiveQuery(async () => {
    const counts = new Map<string, number>()
    for (const pc of await db.pcs.toArray()) counts.set(pc.campaignId, (counts.get(pc.campaignId) ?? 0) + 1)
    return counts
  })
  const quickCombat = useLiveQuery(() => getCombat(QUICK_COMBAT))

  return (
    <section className="page home">
      <div className="home-main">
        <div className="section-header">
          <h2>Campaigns</h2>
        </div>
        <NewCampaignForm />
        {campaigns?.length === 0 && <p className="empty">No campaigns yet. Create one above, or import a backup.</p>}
        <div className="campaign-grid">
          {campaigns?.map((c) => <CampaignCard key={c.id} campaign={c} partySize={partySizes?.get(c.id) ?? 0} />)}
        </div>
      </div>

      <aside className="home-side">
        <div className="card">
          <h3>Quick combat</h3>
          <p className="meta">
            {quickCombat && quickCombat.combatants.length > 0
              ? `${quickCombat.combatants.length} ${quickCombat.combatants.length === 1 ? 'combatant' : 'combatants'}${quickCombat.round > 0 ? `, round ${quickCombat.round}` : ''}`
              : 'A one-off fight, not part of any campaign.'}
          </p>
          <Link to="/quick-combat" className="button primary">
            {quickCombat && quickCombat.combatants.length > 0 ? 'Continue fight' : 'Start a fight'}
          </Link>
        </div>
        <BackupPanel hasCampaigns={(campaigns?.length ?? 0) > 0} />
      </aside>
    </section>
  )
}

// A button that opens a small form for naming a new campaign.
function NewCampaignForm() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const navigate = useNavigate()

  if (!open) return <button type="button" className="primary" onClick={() => setOpen(true)}>+ New campaign</button>

  return (
    <form
      className="panel-form"
      onSubmit={async (e) => {
        e.preventDefault()
        const id = await createCampaign(name.trim(), description.trim())
        navigate(`/campaign/${id}`)  // go straight to the new campaign
      }}
    >
      <label>
        Name
        <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="wide">
        Description
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
      </label>
      <button type="submit" className="primary">Create</button>
      <button type="button" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  )
}

function CampaignCard({ campaign, partySize }: { campaign: Campaign; partySize: number }) {
  return (
    <article className="card campaign-card">
      <Link to={`/campaign/${campaign.id}`} className="campaign-link">
        <h3>{campaign.name}</h3>
        {campaign.description && <p>{campaign.description}</p>}
        <p className="meta">
          {partySize} {partySize === 1 ? 'PC' : 'PCs'} · opened {timeAgo(campaign.lastOpenedAt)}
        </p>
      </Link>
      <div className="card-actions">
        <button type="button" onClick={async () => downloadBackup(await exportCampaigns([campaign.id]), campaign.name)}>
          Export
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => confirm(`Delete "${campaign.name}" and all its party, NPCs, notes and combat? This can't be undone.`) && deleteCampaign(campaign.id)}
        >
          Delete
        </button>
      </div>
    </article>
  )
}

// Export everything to a file, or import campaigns from a backup file.
function BackupPanel({ hasCampaigns }: { hasCampaigns: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  async function importFile(file: File) {
    try {
      const result = await importCampaigns(JSON.parse(await file.text()))
      setMessage({ text: `Imported ${describeImport(result)}.` })
    } catch (e) {
      setMessage({ text: e instanceof SyntaxError ? 'That file is not valid JSON.' : (e as Error).message, error: true })
    }
  }

  return (
    <div className="card">
      <h3>Backups</h3>
      <p className="meta">Campaigns are saved in this browser only. Export a backup to keep them safe or move them to another computer.</p>
      <div className="card-actions">
        <button type="button" disabled={!hasCampaigns} onClick={async () => downloadBackup(await exportCampaigns(), 'gm-companion-backup')}>
          Export all
        </button>
        {/* The real file picker is hidden; this button opens it */}
        <button type="button" onClick={() => fileInput.current?.click()}>Import…</button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) importFile(file)
            e.target.value = ''  // allow choosing the same file again
          }}
        />
      </div>
      {message && <p className={message.error ? 'error' : 'notice'}>{message.text}</p>}
    </div>
  )
}

// e.g. "2 days ago", "just now".
function timeAgo(time: number): string {
  const minutes = Math.round((Date.now() - time) / 60000)
  if (minutes < 1) return 'just now'
  const format = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' })
  if (minutes < 60) return format.format(-minutes, 'minute')
  if (minutes < 60 * 24) return format.format(-Math.round(minutes / 60), 'hour')
  return format.format(-Math.round(minutes / (60 * 24)), 'day')
}
