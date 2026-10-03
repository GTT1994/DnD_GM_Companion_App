// A campaign's prepared encounters: the list (with difficulty and status), and the builder
// for one encounter, which can load it into the campaign's fight.

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Encounter, EncounterMonster, Pc } from '../types'
import { useApp, useCampaignRoute } from '../lib/appContext'
import { formatCr } from '../lib/dice'
import { createEncounter, difficulty, duplicateEncounter, encounterSummary, saveEncounter } from '../lib/encounters'
import { getCombat } from '../lib/store'
import { DifficultyPanel } from '../components/DifficultyPanel'
import { LoadIntoCombat } from '../components/LoadIntoCombat'
import { MonsterPicker } from '../components/MonsterPicker'

export function EncountersPage() {
  const { campaignId, base } = useCampaignRoute()
  const { edition } = useApp()
  const navigate = useNavigate()
  const encounters = useLiveQuery(() => db.encounters.where('campaignId').equals(campaignId!).sortBy('name'), [campaignId])
  const party = useLiveQuery(() => db.pcs.where('campaignId').equals(campaignId!).toArray(), [campaignId])
  const [filter, setFilter] = useState<'all' | Encounter['status']>('all')

  if (!encounters || !party) return <p className="empty">Loading…</p>
  const levels = party.map((pc) => pc.level)
  const shown = encounters.filter((e) => filter === 'all' || e.status === filter)

  return (
    <section className="page">
      <div className="section-header">
        <h2>Encounters</h2>
        <div className="toolbar-buttons">
          <div className="mode-switch compact" role="group" aria-label="Show">
            {(['all', 'planned', 'used'] as const).map((f) => (
              <button key={f} type="button" className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'planned' ? 'Planned' : 'Used'}
              </button>
            ))}
          </div>
          <button type="button" className="primary" onClick={async () => navigate(`${base}/encounters/${await createEncounter(campaignId!)}`)}>
            + New encounter
          </button>
        </div>
      </div>

      {encounters.length === 0 && <p className="empty">No encounters yet. Prepare a fight in advance, then load it into combat at the table.</p>}
      {shown.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Encounter</th>
              <th>Monsters</th>
              <th>Difficulty ({edition})</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.id}>
                <td className="name-cell"><Link to={`${base}/encounters/${e.id}`}>{e.name}</Link></td>
                <td>{encounterSummary(e)}</td>
                <td>{e.monsters.length && party.length ? difficulty(edition, levels, e.monsters).rating : '—'}</td>
                <td><span className={`tag status-${e.status}`}>{e.status === 'planned' ? 'Planned' : 'Used'}</span></td>
                <td className="actions-cell">
                  <button type="button" className="small" onClick={async () => navigate(`${base}/encounters/${await duplicateEncounter(e)}`)}>Duplicate</button>
                  <button type="button" className="small danger" onClick={() => confirm(`Delete "${e.name}"?`) && db.encounters.delete(e.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export function EncounterEditorPage() {
  const { encounterId } = useParams()
  const { campaignId, base } = useCampaignRoute()
  // undefined while loading, null if there's no such encounter.
  const encounter = useLiveQuery(async () => (await db.encounters.get(encounterId!)) ?? null, [encounterId])
  const party = useLiveQuery(() => db.pcs.where('campaignId').equals(campaignId!).sortBy('name'), [campaignId])

  if (encounter === undefined || !party) return <p className="empty">Loading…</p>
  if (encounter === null) return <p className="empty">This encounter doesn't exist. <Link to={`${base}/encounters`}>Back to encounters</Link></p>
  // The editor keeps its own copy while you work, starting from the saved encounter.
  return <EncounterEditor key={encounter.id} initial={encounter} party={party} />
}

function EncounterEditor({ initial, party }: { initial: Encounter; party: Pc[] }) {
  const { edition } = useApp()
  const { base } = useCampaignRoute()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(initial)
  const [saved, setSaved] = useState(true)
  const [absent, setAbsent] = useState<Set<string>>(new Set())  // PCs left out of the difficulty
  const fight = useLiveQuery(() => getCombat(initial.campaignId), [initial.campaignId])

  // Every change saves itself half a second after the last edit.
  const update = (changes: Partial<Encounter>) => {
    setDraft((d) => ({ ...d, ...changes }))
    setSaved(false)
  }
  useEffect(() => {
    if (saved) return
    const timer = setTimeout(async () => {
      await saveEncounter(draft)
      setSaved(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [draft, saved])

  const present = party.filter((pc) => !absent.has(pc.id))
  const d = difficulty(edition, present.map((pc) => pc.level), draft.monsters)
  const setCount = (m: EncounterMonster, count: number) =>
    update({ monsters: count > 0 ? draft.monsters.map((x) => (x === m ? { ...x, count } : x)) : draft.monsters.filter((x) => x !== m) })

  return (
    <section className="page">
      <div className="section-header">
        <h2>{draft.name || 'Encounter'}</h2>
        <span className="meta">{saved ? 'Saved' : 'Saving…'}</span>
        <Link to={`${base}/encounters`}>← Encounters</Link>
      </div>

      <div className="editor-layout">
        <div className="editor-form">
          <fieldset>
            <legend>Details</legend>
            <div className="field-grid">
              <label className="wide">
                Name
                <input value={draft.name} onChange={(e) => update({ name: e.target.value })} />
              </label>
              <label>
                Status
                <select value={draft.status} onChange={(e) => update({ status: e.target.value as Encounter['status'] })}>
                  <option value="planned">Planned</option>
                  <option value="used">Used</option>
                </select>
              </label>
              <label>
                Monster HP
                <select value={draft.hpMode} onChange={(e) => update({ hpMode: e.target.value as Encounter['hpMode'] })}>
                  <option value="average">Average</option>
                  <option value="roll">Roll hit dice</option>
                </select>
              </label>
            </div>
            <label className="block">
              Notes
              <textarea rows={4} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Tactics, terrain, read-aloud text…" />
            </label>
          </fieldset>

          <fieldset>
            <legend>Monsters</legend>
            {draft.monsters.length === 0 && <p className="meta">No monsters yet. Search below to add some.</p>}
            {draft.monsters.map((m) => (
              <div key={`${m.edition}/${m.index}`} className="encounter-monster">
                <span className="encounter-monster-name">
                  {m.name}
                  <span className="meta"> CR {formatCr(m.cr)} · {m.xp.toLocaleString()} XP{m.edition !== edition ? ` · ${m.edition}` : ''}</span>
                </span>
                <span className="counter">
                  <button type="button" className="small" onClick={() => setCount(m, m.count - 1)} aria-label={`One fewer ${m.name}`}>−</button>
                  <strong>{m.count}</strong>
                  <button type="button" className="small" onClick={() => setCount(m, m.count + 1)} aria-label={`One more ${m.name}`}>+</button>
                </span>
                <button type="button" className="small remove" onClick={() => setCount(m, 0)} aria-label={`Remove ${m.name}`}>✕</button>
              </div>
            ))}
            <MonsterPicker
              filters
              onAdd={(ref) => {
                const existing = draft.monsters.find((m) => m.index === ref.index && m.edition === ref.edition)
                if (existing) setCount(existing, existing.count + 1)
                else update({ monsters: [...draft.monsters, ref] })
              }}
            />
          </fieldset>
        </div>

        <div className="editor-preview">
          <h3>Difficulty</h3>
          <DifficultyPanel difficulty={d} partySize={present.length} />
          {party.length > 0 && (
            <div className="party-picker">
              <span className="meta">Party at this session:</span>
              {party.map((pc) => (
                <label key={pc.id} className="checkbox">
                  <input
                    type="checkbox"
                    checked={!absent.has(pc.id)}
                    onChange={(e) => {
                      const next = new Set(absent)
                      if (e.target.checked) next.delete(pc.id)
                      else next.add(pc.id)
                      setAbsent(next)
                    }}
                  />
                  {pc.name} <span className="meta">(level {pc.level})</span>
                </label>
              ))}
            </div>
          )}
          <LoadIntoCombat
            encounter={draft}
            hasMonstersInFight={fight?.combatants.some((c) => !c.isPlayer) ?? false}
            onLoaded={() => navigate(`${base}/combat`)}
          />
        </div>
      </div>
    </section>
  )
}
