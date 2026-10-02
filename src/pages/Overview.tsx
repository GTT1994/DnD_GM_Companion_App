// A campaign's overview page, laid out for running a session. On the left: the plan for this
// session (with a template, and "End session" to save it to the session log) and the ongoing
// campaign notes, both formatted. On the right: the party (HP, AC, passive scores) and the
// encounters planned for the campaign, ready to load into combat.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Campaign, Pc } from '../types'
import { useApp, useCampaignRoute } from '../lib/appContext'
import { addPc, deletePc, getCombat, longRest, updateCampaign, updatePc } from '../lib/store'
import { difficulty, encounterSummary } from '../lib/encounters'
import { carryOver, emptyDoc, isEmptyDoc, sessionTemplate, type RichDoc } from '../lib/richText'
import { endSession, getNote, nextSessionNumber, saveNote, today } from '../lib/sessions'
import { useAutosave } from '../lib/useAutosave'
import { PcForm } from '../components/PcForm'
import { RichEditor } from '../components/RichEditor'
import { LoadIntoCombat } from '../components/LoadIntoCombat'

export function Overview() {
  const { campaignId } = useCampaignRoute()
  const campaign = useLiveQuery(() => db.campaigns.get(campaignId!), [campaignId])
  const party = useLiveQuery(() => db.pcs.where('campaignId').equals(campaignId!).sortBy('name'), [campaignId])
  // The notes are read once when the page opens; after that the editors keep their own copies.
  const note = useLiveQuery(() => getNote(campaignId!), [campaignId])
  // Which form is open: null = none, 'new' = adding a PC, otherwise the id of the PC being edited.
  const [editing, setEditing] = useState<string | null>(null)

  if (!campaign || !party || !note) return <p className="empty">Loading…</p>
  const editingPc = party.find((pc) => pc.id === editing)

  return (
    <section className="page">
      <CampaignDetails campaign={campaign} />

      {editing === 'new' && (
        <PcForm
          onSave={async (fields) => {
            await addPc(campaign.id, fields)
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      {editingPc && (
        <PcForm
          key={editingPc.id}
          pc={editingPc}
          onSave={async (fields) => {
            await updatePc(editingPc, fields)
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="overview-layout">
        <div className="overview-main">
          <SessionPlan key={`plan-${campaign.id}`} campaignId={campaign.id} initial={note.plan} />
          <CampaignNotes key={`notes-${campaign.id}`} campaignId={campaign.id} initial={note.doc} />
        </div>
        <aside className="overview-side">
          <Party campaign={campaign} party={party} onEdit={setEditing} />
          <PlannedEncounters campaignId={campaign.id} party={party} />
        </aside>
      </div>
    </section>
  )
}

// --- Notes ------------------------------------------------------------------------------

// This session's plan, with the template and End session.
function SessionPlan({ campaignId, initial }: { campaignId: string; initial: RichDoc }) {
  const { base } = useCampaignRoute()
  const [plan, setPlan] = useState(initial)
  const [version, setVersion] = useState(0)  // bumped to load new content into the editor
  const [ending, setEnding] = useState(false)
  const [message, setMessage] = useState('')
  const autosave = useAutosave((doc: RichDoc) => saveNote(campaignId, { plan: doc }))

  // Replaces the editor's content (and saves it).
  function load(doc: RichDoc) {
    setPlan(doc)
    setVersion((v) => v + 1)
    autosave.change(doc)
  }

  return (
    <section className="notes-section session-plan">
      <div className="section-header">
        <h2>This session</h2>
        <span className="meta">{autosave.saved ? 'Saved' : 'Saving…'}</span>
        <div className="toolbar-buttons">
          {isEmptyDoc(plan) && <button type="button" onClick={() => load(sessionTemplate())}>Start from template</button>}
          <button type="button" className={ending ? 'selected' : ''} onClick={() => setEnding(!ending)} disabled={isEmptyDoc(plan)}>End session</button>
        </div>
      </div>
      {ending && (
        <EndSessionForm
          campaignId={campaignId}
          onCancel={() => setEnding(false)}
          onSave={async (fields) => {
            autosave.cancel()  // the plan is saved with the session instead
            await endSession(campaignId, plan, fields)
            setPlan(carryOver(plan))
            setVersion((v) => v + 1)
            setEnding(false)
            setMessage(`Session ${fields.number} saved to the log.`)
          }}
        />
      )}
      {message && <p className="notice">{message} <Link to={`${base}/sessions`}>See sessions</Link></p>}
      <RichEditor
        key={version}
        initial={plan}
        label="Session plan"
        placeholder="What's planned for this session? Try Start from template, or type [ ] for a tick-box."
        minHeight="14rem"
        onChange={(doc) => {
          setPlan(doc)
          autosave.change(doc)
        }}
      />
    </section>
  )
}

type EndSessionFields = { number: number; date: string; title: string; recap: RichDoc }

// The form for ending a session: number, date, title and a recap.
function EndSessionForm({ campaignId, onSave, onCancel }: { campaignId: string; onSave: (fields: EndSessionFields) => Promise<void>; onCancel: () => void }) {
  const suggested = useLiveQuery(() => nextSessionNumber(campaignId), [campaignId])
  const [number, setNumber] = useState('')
  const [date, setDate] = useState(today())
  const [title, setTitle] = useState('')
  const [recap, setRecap] = useState<RichDoc>(emptyDoc())
  const value = parseInt(number || String(suggested ?? ''))

  return (
    <form
      className="end-session card"
      aria-label="End session"
      onSubmit={async (e) => {
        e.preventDefault()
        if (value > 0) await onSave({ number: value, date, title: title.trim(), recap })
      }}
    >
      <p className="meta">Saves the plan and your recap to the session log. Unticked items carry over to the next plan.</p>
      <div className="end-session-fields">
        <label>
          Session
          <input type="number" min={1} className="tiny-input" value={number || (suggested ?? '')} onChange={(e) => setNumber(e.target.value)} />
        </label>
        <label>
          Date
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="grow">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The goblin ambush" />
        </label>
      </div>
      <RichEditor initial={recap} onChange={setRecap} label="Recap" placeholder="What happened? Loot, XP, threads to follow up…" minHeight="6rem" />
      <div className="popover-buttons">
        <button type="submit" className="primary" disabled={!(value > 0)}>Save session</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// The campaign's ongoing notes (what used to be the Notes page).
function CampaignNotes({ campaignId, initial }: { campaignId: string; initial: RichDoc }) {
  const autosave = useAutosave((doc: RichDoc) => saveNote(campaignId, { doc }))
  return (
    <section className="notes-section">
      <div className="section-header">
        <h2>Campaign notes</h2>
        <span className="meta">{autosave.saved ? 'Saved' : 'Saving…'}</span>
      </div>
      <RichEditor
        initial={initial}
        label="Campaign notes"
        placeholder="Plot threads, places, names to remember…"
        minHeight="10rem"
        onChange={autosave.change}
      />
    </section>
  )
}

// --- Party ------------------------------------------------------------------------------

// The party as compact cards: HP, AC and passive scores at a glance.
function Party({ campaign, party, onEdit }: { campaign: Campaign; party: Pc[]; onEdit: (id: string) => void }) {
  const { base } = useCampaignRoute()
  return (
    <section className="party">
      <div className="section-header">
        <h2>Party</h2>
        <div className="toolbar-buttons">
          <button type="button" className="primary small" onClick={() => onEdit('new')}>+ Add PC</button>
          <button
            type="button"
            className="small"
            disabled={party.length === 0}
            onClick={() => confirm('Long rest: restore every PC to full HP?') && longRest(campaign.id)}
          >
            Long rest
          </button>
          <Link to={`${base}/combat`} className="button small">Go to combat</Link>
        </div>
      </div>
      {party.length === 0 && <p className="empty">No party members yet. Add your players' characters to track their HP and passive scores.</p>}
      {party.map((pc) => {
        const percent = Math.round((pc.currentHp / pc.maxHp) * 100)
        return (
          <article key={pc.id} className={`pc-card ${pc.currentHp === 0 ? 'down' : ''}`}>
            <div className="pc-card-top">
              <div>
                <strong className="pc-name">{pc.name}</strong>
                <span className="meta"> {pc.className ? `${pc.className} ${pc.level}` : `Level ${pc.level}`}</span>
                {pc.playerName && <div className="meta">played by {pc.playerName}</div>}
              </div>
              <div className="pc-card-buttons">
                <button type="button" className="small" onClick={() => onEdit(pc.id)}>Edit</button>
                <button
                  type="button"
                  className="small remove"
                  aria-label={`Remove ${pc.name}`}
                  onClick={() => confirm(`Remove ${pc.name} from the party?`) && deletePc(pc.id)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="pc-stats">
              <span className="pc-hp">
                HP <strong>{pc.currentHp}</strong> / {pc.maxHp}
                {pc.tempHp > 0 && <span className="temp-hp"> +{pc.tempHp} temp</span>}
                {pc.currentHp === 0 && <span className="down-label"> Down</span>}
              </span>
              <span>AC <strong>{pc.ac}</strong></span>
            </div>
            <div className="hp-bar">
              <div className={`hp-fill ${percent <= 25 ? 'low' : percent <= 50 ? 'mid' : ''}`} style={{ width: `${percent}%` }} />
            </div>
            <div className="pc-passives">
              <span title="Passive Wisdom (Perception)">Perception <strong>{pc.passivePerception}</strong></span>
              <span title="Passive Wisdom (Insight)">Insight <strong>{pc.passiveInsight}</strong></span>
              <span title="Passive Intelligence (Investigation)">Investigation <strong>{pc.passiveInvestigation}</strong></span>
            </div>
          </article>
        )
      })}
    </section>
  )
}

// --- Encounters -------------------------------------------------------------------------

// Encounters marked Planned, with their difficulty for the party and Load into combat.
function PlannedEncounters({ campaignId, party }: { campaignId: string; party: Pc[] }) {
  const { edition } = useApp()
  const { base } = useCampaignRoute()
  const navigate = useNavigate()
  const planned = useLiveQuery(
    async () => (await db.encounters.where('campaignId').equals(campaignId).sortBy('name')).filter((e) => e.status === 'planned'),
    [campaignId],
  )
  const fight = useLiveQuery(() => getCombat(campaignId), [campaignId])
  if (!planned) return null

  return (
    <section className="planned-encounters">
      <div className="section-header">
        <h2>Planned encounters</h2>
        <Link to={`${base}/encounters`} className="button small">All encounters</Link>
      </div>
      {planned.length === 0 && <p className="meta">No planned encounters. Prepare one on the Encounters page.</p>}
      {planned.map((e) => (
        <article key={e.id} className="planned-encounter">
          <div>
            <Link to={`${base}/encounters/${e.id}`} className="encounter-link">{e.name}</Link>
            {e.monsters.length > 0 && party.length > 0 && (
              <span className="tag">{difficulty(edition, party.map((pc) => pc.level), e.monsters).rating}</span>
            )}
          </div>
          <div className="meta">{encounterSummary(e) || 'No monsters yet'}</div>
          <LoadIntoCombat
            encounter={e}
            hasMonstersInFight={fight?.combatants.some((c) => !c.isPlayer) ?? false}
            onLoaded={() => navigate(`${base}/combat`)}
          />
        </article>
      ))}
    </section>
  )
}

// --- Campaign details -------------------------------------------------------------------

// The campaign's name and description, with an Edit button that swaps in a form.
function CampaignDetails({ campaign }: { campaign: Campaign }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(campaign.name)
  const [description, setDescription] = useState(campaign.description)

  if (!editing) {
    return (
      <div className="campaign-details">
        <div>
          <h2>{campaign.name}</h2>
          {campaign.description && <p className="meta">{campaign.description}</p>}
        </div>
        <button type="button" onClick={() => setEditing(true)}>Edit</button>
      </div>
    )
  }

  return (
    <form
      className="panel-form"
      onSubmit={async (e) => {
        e.preventDefault()
        await updateCampaign(campaign.id, { name: name.trim(), description: description.trim() })
        setEditing(false)
      }}
    >
      <label>
        Name
        <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="wide">
        Description
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <button type="submit" className="primary">Save</button>
      <button type="button" onClick={() => setEditing(false)}>Cancel</button>
    </form>
  )
}
