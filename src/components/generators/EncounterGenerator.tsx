// The Encounter tab: a random encounter for an environment and difficulty, balanced against the
// campaign's party (untick anyone who's absent) or a party size and level typed in. It can be
// saved as a planned encounter, or loaded straight into the fight.

import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, QUICK_COMBAT } from '../../db'
import type { Edition } from '../../types'
import { useSrd } from '../../data/srd'
import { ENVIRONMENT_LABELS, ENVIRONMENTS, type Environment } from '../../data/environments'
import { useCampaignRoute } from '../../lib/appContext'
import { formatCr } from '../../lib/dice'
import { createEncounter, difficulty, loadEncounter, resolveMonster, saveEncounter, type LoadGroup } from '../../lib/encounters'
import { DIFFICULTIES, generateEncounter, type RandomEncounter } from '../../lib/randomEncounter'
import { addPartyToCombat } from '../../lib/store'
import { useSavedState } from '../../lib/storage'
import { HISTORY } from './shared'

export function EncounterGenerator({ edition }: { edition: Edition }) {
  const { campaignId, base } = useCampaignRoute()
  const navigate = useNavigate()
  const monsters = useSrd(edition, 'monsters')
  const party = useLiveQuery(() => (campaignId ? db.pcs.where('campaignId').equals(campaignId).sortBy('name') : []), [campaignId])
  const [environment, setEnvironment] = useSavedState<Environment>('encounter-env', 'forest')
  const [target, setTarget] = useState('')
  const [typedParty, setTypedParty] = useSavedState('encounter-party', { size: 4, level: 3 })
  const [absent, setAbsent] = useState<Set<string>>(new Set())
  const [results, setResults] = useSavedState<RandomEncounter[]>('encounters', [])
  const [message, setMessage] = useState('')

  // The difficulty list changes with the edition; default to the middle one.
  const difficulties = DIFFICULTIES[edition]
  const chosen = difficulties.includes(target) ? target : difficulties[1]
  // Levels of the PCs at the table: the campaign's party, or the typed-in size and level.
  const usesParty = !!party?.length
  const levels = usesParty
    ? party!.filter((pc) => !absent.has(pc.id)).map((pc) => pc.level)
    : Array.from({ length: typedParty.size }, () => typedParty.level)

  function generate() {
    const enc = generateEncounter(edition, monsters ?? [], environment, chosen, levels)
    setMessage(enc ? '' : `No ${edition} monsters are tagged for ${ENVIRONMENT_LABELS[environment].toLowerCase()} yet.`)
    if (enc) setResults([enc, ...results].slice(0, HISTORY))
  }

  const nameFor = (enc: RandomEncounter) => `${ENVIRONMENT_LABELS[enc.environment]}: ${enc.monsters.map((m) => (m.count > 1 ? `${m.count} × ${m.name}` : m.name)).join(', ')}`

  // Saves it as a planned encounter and opens it in the encounter builder.
  async function save(enc: RandomEncounter) {
    const id = await createEncounter(campaignId!)
    const saved = await db.encounters.get(id)
    await saveEncounter({ ...saved!, name: nameFor(enc), notes: `They're ${enc.reason}.`, monsters: enc.monsters })
    navigate(`${base}/encounters/${id}`)
  }

  // Adds the monsters (and, in a campaign, the party) to the fight and goes to it.
  async function load(enc: RandomEncounter) {
    const combatId = campaignId ?? QUICK_COMBAT
    const groups: LoadGroup[] = []
    for (const ref of enc.monsters) {
      const monster = await resolveMonster(ref)
      if (monster) groups.push({ ref, monster })
    }
    // Not saved as an encounter: a temporary one just for loading.
    const temporary = { id: enc.id, campaignId: combatId, name: nameFor(enc), notes: '', status: 'planned' as const, hpMode: 'average' as const, monsters: enc.monsters, updatedAt: 0 }
    await loadEncounter(temporary, groups, 'add')
    if (campaignId) await addPartyToCombat(campaignId)
    navigate(campaignId ? `${base}/combat` : '/quick-combat')
  }

  return (
    <div className="generator">
      <div className="generator-controls">
        <select value={environment} onChange={(e) => setEnvironment(e.target.value as Environment)} aria-label="Environment">
          {ENVIRONMENTS.map((env) => <option key={env} value={env}>{ENVIRONMENT_LABELS[env]}</option>)}
        </select>
        <select value={chosen} onChange={(e) => setTarget(e.target.value)} aria-label="Difficulty">
          {difficulties.map((d) => <option key={d}>{d}</option>)}
        </select>
        <button type="button" className="primary" onClick={generate} disabled={!monsters || levels.length === 0}>Generate encounter</button>
        {results.length > 0 && <button type="button" onClick={() => setResults([])}>Clear</button>}
      </div>

      {/* Who it's balanced for */}
      <div className="generator-party">
        {usesParty ? (
          <>
            <span className="meta">Balanced for:</span>
            {party!.map((pc) => (
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
                {pc.name} <span className="meta">({pc.level})</span>
              </label>
            ))}
          </>
        ) : (
          <>
            <label>
              Party size
              <input type="number" min={1} max={10} className="tiny-input" value={typedParty.size} onChange={(e) => setTypedParty({ ...typedParty, size: Math.max(1, parseInt(e.target.value) || 1) })} />
            </label>
            <label>
              Level
              <input type="number" min={1} max={20} className="tiny-input" value={typedParty.level} onChange={(e) => setTypedParty({ ...typedParty, level: Math.min(20, Math.max(1, parseInt(e.target.value) || 1)) })} />
            </label>
          </>
        )}
      </div>
      {message && <p className="meta">{message}</p>}

      <div className="generator-results">
        {results.map((enc) => {
          const d = difficulty(enc.edition, levels, enc.monsters)
          return (
            <article key={enc.id} className="card random-encounter">
              <h3>{ENVIRONMENT_LABELS[enc.environment]} <span className="tag">{d.rating}</span></h3>
              <ul>
                {enc.monsters.map((m) => (
                  <li key={m.index}>
                    {m.count > 1 && `${m.count} × `}<strong>{m.name}</strong>
                    <span className="meta"> CR {formatCr(m.cr)} · {(m.xp * m.count).toLocaleString()} XP</span>
                  </li>
                ))}
              </ul>
              <p className="meta">They're {enc.reason}. {d.xp.toLocaleString()} XP{d.multiplier && d.multiplier !== 1 ? ` (${d.compareXp.toLocaleString()} adjusted)` : ''} · {enc.edition} rules</p>
              <div className="card-actions">
                {campaignId && <button type="button" className="small" onClick={() => save(enc)}>Save as encounter</button>}
                <button type="button" className="small" onClick={() => load(enc)}>Load into combat</button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
