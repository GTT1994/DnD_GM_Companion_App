// The "Load into combat" button for a prepared encounter: adds its monsters (and optionally the
// party) to the campaign's fight, asking first whether to replace or add to monsters already there.
// Used on the encounter page and the campaign Overview.

import { useState } from 'react'
import type { Encounter } from '../types'
import { loadEncounter, resolveMonster, saveEncounter, type LoadGroup } from '../lib/encounters'
import { addPartyToCombat } from '../lib/store'

type LoadIntoCombatProps = {
  encounter: Encounter
  hasMonstersInFight: boolean
  onLoaded: () => void
}

// The "Load into combat" button. If monsters are already in the fight, asks whether to replace or add to them.
export function LoadIntoCombat({ encounter, hasMonstersInFight, onLoaded }: LoadIntoCombatProps) {
  const [asking, setAsking] = useState(false)
  const [withParty, setWithParty] = useState(true)
  const [message, setMessage] = useState('')

  async function load(mode: 'replace' | 'add') {
    setMessage('Loading…')
    await saveEncounter(encounter)  // make sure the latest edits are saved first
    // Look up each monster's full stat block; skip any that no longer exist (e.g. deleted homebrew).
    const groups: LoadGroup[] = []
    const missing: string[] = []
    for (const ref of encounter.monsters) {
      const monster = await resolveMonster(ref)
      if (monster) groups.push({ ref, monster })
      else missing.push(ref.name)
    }
    await loadEncounter(encounter, groups, mode)
    if (withParty) await addPartyToCombat(encounter.campaignId)
    if (missing.length) {
      setMessage(`Loaded, but couldn't find: ${missing.join(', ')}.`)
      setAsking(false)
      return
    }
    onLoaded()
  }

  if (encounter.monsters.length === 0) return null
  return (
    <div className="load-encounter">
      <label className="checkbox">
        <input type="checkbox" checked={withParty} onChange={(e) => setWithParty(e.target.checked)} />
        Also add the party (if not already in the fight)
      </label>
      {!asking ? (
        <button type="button" className="primary" onClick={() => (hasMonstersInFight ? setAsking(true) : load('add'))}>
          Load into combat
        </button>
      ) : (
        <div className="load-choice">
          <p>There are already monsters in the fight.</p>
          <button type="button" className="primary" onClick={() => load('replace')}>Replace them</button>
          <button type="button" onClick={() => load('add')}>Add to them</button>
          <button type="button" onClick={() => setAsking(false)}>Cancel</button>
        </div>
      )}
      {message && <p className="meta">{message}</p>}
    </div>
  )
}
