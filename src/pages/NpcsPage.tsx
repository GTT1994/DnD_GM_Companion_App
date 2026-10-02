// A campaign's NPCs: a searchable table of them, and each NPC's own page, where every field
// can be edited (saving as you type) next to a read-only view with the notes formatted.

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Npc, NpcAttitude, NpcStatus } from '../types'
import { useCampaignRoute } from '../lib/appContext'
import { ATTITUDES, filterNpcs, GENDERS, SPECIES, STATUSES, type NpcFilter } from '../lib/npcFields'
import { addNpcToCombat, createNpc, duplicateNpc, resizeImage, saveNpc } from '../lib/npcs'
import { useSavedState } from '../lib/storage'
import { Markdown } from '../components/Markdown'
import { MonsterPicker } from '../components/MonsterPicker'

export function NpcsPage() {
  const { campaignId, base } = useCampaignRoute()
  const navigate = useNavigate()
  const npcs = useLiveQuery(() => db.npcs.where('campaignId').equals(campaignId!).toArray(), [campaignId])
  // The search and filters are remembered per campaign.
  const [filter, setFilter] = useSavedState<NpcFilter>(`npc-filter:${campaignId}`, { search: '', attitude: 'all', status: 'all' })

  if (!npcs) return <p className="empty">Loading…</p>
  const shown = filterNpcs(npcs, filter)

  return (
    <section className="page">
      <div className="section-header">
        <h2>NPCs</h2>
        <div className="toolbar-buttons">
          <Link to={`${base}/generators`} className="button">Generate NPCs</Link>
          <button type="button" className="primary" onClick={async () => navigate(`${base}/npcs/${encodeURIComponent(await createNpc(campaignId!))}`)}>
            + New NPC
          </button>
        </div>
      </div>

      {npcs.length === 0 ? (
        <p className="empty">No NPCs yet. Write one with <strong>+ New NPC</strong>, or generate some and use <strong>Save to campaign</strong>.</p>
      ) : (
        <>
          <div className="npc-filters">
            <input
              type="search"
              className="homebrew-search"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              placeholder="Search NPCs and their notes…"
              aria-label="Search NPCs"
            />
            <select value={filter.attitude} onChange={(e) => setFilter({ ...filter, attitude: e.target.value as NpcFilter['attitude'] })} aria-label="Attitude">
              <option value="all">Any attitude</option>
              {Object.entries(ATTITUDES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value as NpcFilter['status'] })} aria-label="Status">
              <option value="all">Any status</option>
              {Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <span className="meta">{shown.length} of {npcs.length}</span>
          </div>
          {shown.length === 0 ? <p className="empty">No NPCs match.</p> : (
            <table className="data-table npc-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Species</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Faction</th>
                  <th>Attitude</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((npc) => (
                  <tr key={npc.id} className={npc.status === 'dead' ? 'npc-dead' : ''}>
                    <td className="portrait-cell">{npc.portrait ? <img src={npc.portrait} alt="" className="portrait-thumb" /> : null}</td>
                    <td className="name-cell"><Link to={`${base}/npcs/${encodeURIComponent(npc.id)}`}>{npc.name || 'Unnamed NPC'}</Link></td>
                    <td>{npc.species}{npc.gender && <span className="meta"> · {npc.gender}</span>}</td>
                    <td>{npc.role}</td>
                    <td>{npc.location}</td>
                    <td>{npc.faction}</td>
                    <td><span className={`tag attitude-${npc.attitude}`}>{ATTITUDES[npc.attitude]}</span></td>
                    <td><span className={`tag npc-status-${npc.status}`}>{STATUSES[npc.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  )
}

export function NpcPage() {
  const { npcId } = useParams()
  const { base } = useCampaignRoute()
  // undefined while loading, null if there's no such NPC.
  const npc = useLiveQuery(async () => (await db.npcs.get(npcId!)) ?? null, [npcId])

  if (npc === undefined) return <p className="empty">Loading…</p>
  if (npc === null) return <p className="empty">This NPC doesn't exist. <Link to={`${base}/npcs`}>Back to NPCs</Link></p>
  // The editor keeps its own copy while you type, starting from the saved NPC.
  return <NpcEditor key={npc.id} initial={npc} />
}

function NpcEditor({ initial }: { initial: Npc }) {
  const { base } = useCampaignRoute()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(initial)
  const [saved, setSaved] = useState(true)
  const [message, setMessage] = useState('')
  const unsaved = useRef<Npc | null>(null)  // edits not yet written, so leaving the page straight away still saves them

  const update = (changes: Partial<Npc>) => {
    const next = { ...draft, ...changes }
    unsaved.current = next
    setDraft(next)
    setSaved(false)
  }

  // Every change saves itself half a second after the last edit.
  useEffect(() => {
    if (saved) return
    const timer = setTimeout(async () => {
      unsaved.current = null
      await saveNpc(draft)
      setSaved(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [draft, saved])

  // Leaving the page: save anything still waiting.
  useEffect(() => () => {
    if (unsaved.current) saveNpc(unsaved.current)
  }, [])

  async function remove() {
    if (!confirm(`Delete ${draft.name || 'this NPC'}?`)) return
    unsaved.current = null
    await db.npcs.delete(draft.id)
    navigate(`${base}/npcs`)
  }

  async function addToCombat() {
    unsaved.current = null
    await saveNpc(draft)
    setMessage((await addNpcToCombat(draft)) ? 'added' : `Couldn't find the ${draft.statBlock?.name} stat block.`)
  }

  const text = (field: keyof Npc, label: string, props: { wide?: boolean; placeholder?: string; list?: string } = {}) => (
    <label className={props.wide ? 'wide' : ''}>
      {label}
      <input value={draft[field] as string} onChange={(e) => update({ [field]: e.target.value })} placeholder={props.placeholder} list={props.list} />
    </label>
  )

  return (
    <section className="page">
      <div className="section-header">
        <h2>{draft.name || 'Unnamed NPC'}</h2>
        <span className="meta">{saved ? 'Saved' : 'Saving…'}</span>
        <div className="toolbar-buttons">
          <Link to={`${base}/npcs`}>← NPCs</Link>
          <button type="button" className="small" onClick={async () => navigate(`${base}/npcs/${encodeURIComponent(await duplicateNpc(draft))}`)}>Duplicate</button>
          <button type="button" className="small danger" onClick={remove}>Delete</button>
        </div>
      </div>

      <div className="editor-layout">
        <div className="editor-form">
          <fieldset>
            <legend>Basics</legend>
            <div className="field-grid npc-basics">
              {text('name', 'Name', { wide: true })}
              <SpeciesField value={draft.species} onChange={(species) => update({ species })} />
              {text('gender', 'Gender', { list: 'npc-genders' })}
              <datalist id="npc-genders">{GENDERS.map((g) => <option key={g} value={g} />)}</datalist>
              {text('role', 'Role', { placeholder: 'e.g. Innkeeper' })}
              {text('location', 'Location', { placeholder: 'Where to find them' })}
              {text('faction', 'Faction')}
              <label>
                Attitude
                <select value={draft.attitude} onChange={(e) => update({ attitude: e.target.value as NpcAttitude })}>
                  {Object.entries(ATTITUDES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                Status
                <select value={draft.status} onChange={(e) => update({ status: e.target.value as NpcStatus })}>
                  {Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Portrait</legend>
            <PortraitField value={draft.portrait} onChange={(portrait) => update({ portrait })} />
          </fieldset>

          <fieldset>
            <legend>Roleplay</legend>
            <div className="field-grid npc-roleplay">
              {text('appearance', 'Appearance', { wide: true })}
              {text('personality', 'Personality', { wide: true })}
              {text('mannerism', 'Voice / mannerism', { wide: true })}
              {text('motivation', 'Wants to', { wide: true })}
              {text('secret', 'Secret', { wide: true })}
            </div>
          </fieldset>

          <fieldset>
            <legend>Stat block</legend>
            {draft.statBlock ? (
              <div className="npc-stat-block">
                <span>
                  Fights as <strong>{draft.statBlock.name}</strong>
                  <span className="meta"> ({draft.statBlock.edition}{draft.statBlock.index.startsWith('hb-') ? ', homebrew' : ''})</span>
                </span>
                <button type="button" className="primary" onClick={addToCombat}>Add to combat</button>
                <button type="button" className="small remove" onClick={() => update({ statBlock: undefined })} aria-label="Remove stat block">✕</button>
              </div>
            ) : (
              <MonsterPicker placeholder="Search for a stat block…" onAdd={(m) => update({ statBlock: { edition: m.edition, index: m.index, name: m.name } })} />
            )}
            {message === 'added'
              ? <p className="notice">Added to combat. <Link to={`${base}/combat`}>Go to combat</Link></p>
              : message && <p className="field-error">{message}</p>}
          </fieldset>

          <fieldset>
            <legend>Notes</legend>
            <textarea
              className="npc-notes"
              aria-label="Notes"
              value={draft.notes}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Where the party met them, what they know… Markdown works: **bold**, - lists, ## headings"
            />
          </fieldset>
        </div>

        <NpcView npc={draft} />
      </div>
    </section>
  )
}

// The read-only view beside the form: how the NPC looks at a glance, with the notes formatted.
function NpcView({ npc }: { npc: Npc }) {
  const line = [npc.gender, npc.species, npc.role].filter(Boolean).join(' ')
  const roleplay: [string, string][] = [
    ['Looks', npc.appearance], ['Personality', npc.personality], ['Voice / mannerism', npc.mannerism],
    ['Wants to', npc.motivation], ['Secret', npc.secret],
  ]
  return (
    <div className="editor-preview npc-view">
      <div className="npc-view-header">
        {npc.portrait && <img src={npc.portrait} alt={`Portrait of ${npc.name}`} className="portrait" />}
        <div>
          <h2>{npc.name || 'Unnamed NPC'}</h2>
          {line && <p className="meta">{line}</p>}
          <p>
            <span className={`tag attitude-${npc.attitude}`}>{ATTITUDES[npc.attitude]}</span>
            <span className={`tag npc-status-${npc.status}`}>{STATUSES[npc.status]}</span>
          </p>
          {(npc.location || npc.faction) && (
            <p className="meta">{[npc.location && `📍 ${npc.location}`, npc.faction && `⚑ ${npc.faction}`].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      </div>
      {roleplay.some(([, value]) => value) && (
        <ul className="npc-roleplay-list">
          {roleplay.filter(([, value]) => value).map(([label, value]) => <li key={label}><strong>{label}:</strong> {value}</li>)}
        </ul>
      )}
      {npc.notes.trim() && <Markdown text={npc.notes} />}
    </div>
  )
}

// Species: pick from the list, or choose "Custom…" and type any species.
function SpeciesField({ value, onChange }: { value: string; onChange: (species: string) => void }) {
  const [custom, setCustom] = useState(value !== '' && !SPECIES.includes(value))
  return (
    <label>
      Species
      <select
        value={custom ? 'custom' : value}
        onChange={(e) => {
          const chosen = e.target.value
          setCustom(chosen === 'custom')
          onChange(chosen === 'custom' ? '' : chosen)
        }}
      >
        <option value="">—</option>
        {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
        <option value="custom">Custom…</option>
      </select>
      {custom && <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Type a species" aria-label="Custom species" autoFocus />}
    </label>
  )
}

// Upload, replace or remove a portrait. The image is shrunk before it's stored.
function PortraitField({ value, onChange }: { value?: string; onChange: (portrait: string | undefined) => void }) {
  const [error, setError] = useState('')
  return (
    <div className="portrait-field">
      {value && <img src={value} alt="Portrait" className="portrait" />}
      <div>
        <label className="button">
          {value ? 'Replace image' : 'Upload image'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''  // so picking the same file again still triggers a change
              if (!file) return
              try {
                onChange(await resizeImage(file))
                setError('')
              } catch {
                setError("That file couldn't be read as an image.")
              }
            }}
          />
        </label>
        {value && <button type="button" className="small" onClick={() => onChange(undefined)}>Remove</button>}
        {error && <p className="field-error">{error}</p>}
      </div>
    </div>
  )
}
