// A search box for picking a monster from the current edition's SRD and homebrew lists.
// Used by the encounter builder and for an NPC's stat block.

import { useState } from 'react'
import type { EncounterMonster } from '../types'
import { useSrd } from '../data/srd'
import { useApp } from '../lib/appContext'
import { formatCr } from '../lib/dice'

// Search box for picking an SRD or homebrew monster (current edition).
export function MonsterPicker({ onAdd, placeholder }: { onAdd: (ref: EncounterMonster) => void; placeholder?: string }) {
  const { edition } = useApp()
  const monsters = useSrd(edition, 'monsters')
  const [query, setQuery] = useState('')
  const text = query.trim().toLowerCase()
  // Best matches first: names starting with the search, then the rest.
  const results = text
    ? (monsters ?? [])
        .filter((m) => m.name.toLowerCase().includes(text))
        .sort((a, b) => Number(!a.name.toLowerCase().startsWith(text)) - Number(!b.name.toLowerCase().startsWith(text)))
        .slice(0, 8)
    : []

  return (
    <div className="monster-picker">
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder ?? `Add a monster (${edition})…`} />
      {results.length > 0 && (
        <ul className="results">
          {results.map((m) => (
            <li key={m.index}>
              <button type="button" onClick={() => onAdd({ edition, index: m.index, name: m.name, count: 1, xp: m.xp, cr: m.cr })}>
                <span className="result-name">{m.name}</span>
                <span className="result-subtitle">{m.homebrew ? 'Homebrew · ' : ''}CR {formatCr(m.cr)} · {m.xp.toLocaleString()} XP</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
