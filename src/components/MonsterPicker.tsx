// A search box for picking a monster from the current edition's SRD and homebrew lists.
// Used by the encounter builder (with the same filters as Quick Lookup) and for an NPC's stat block.

import { useState } from 'react'
import type { EncounterMonster } from '../types'
import { useSrd } from '../data/srd'
import { useApp } from '../lib/appContext'
import { formatCr } from '../lib/dice'
import { activeMonsterFilters, compareMonsters, monsterMatches, NO_MONSTER_FILTERS, type MonsterFilters } from '../lib/lookupFilters'
import { useSavedState } from '../lib/storage'
import { MonsterFilterBar } from './FilterBars'

type MonsterPickerProps = {
  onAdd: (ref: EncounterMonster) => void
  placeholder?: string
  filters?: boolean  // show the filter bar (shares its saved filters with Quick Lookup)
}

// Search box for picking an SRD or homebrew monster (current edition).
export function MonsterPicker({ onAdd, placeholder, filters: showFilters }: MonsterPickerProps) {
  const { edition } = useApp()
  const monsters = useSrd(edition, 'monsters')
  const [query, setQuery] = useState('')
  const [saved, setFilters] = useSavedState<MonsterFilters>('monster-filters', NO_MONSTER_FILTERS)
  const filters = showFilters ? { ...NO_MONSTER_FILTERS, ...saved } : NO_MONSTER_FILTERS
  const filtering = activeMonsterFilters(filters) > 0
  const text = query.trim().toLowerCase()
  // Best matches first: names starting with the search, then the rest; then by name or CR.
  // With filters on, the list shows even without search text.
  const results = text || filtering
    ? (monsters ?? [])
        .filter((m) => m.name.toLowerCase().includes(text) && monsterMatches(m, filters))
        .sort((a, b) => Number(!a.name.toLowerCase().startsWith(text)) - Number(!b.name.toLowerCase().startsWith(text)) || compareMonsters(a, b, filters.sort))
        .slice(0, filtering ? 50 : 8)
    : []

  return (
    <div className="monster-picker">
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder ?? `Add a monster (${edition})…`} />
      {showFilters && monsters && <MonsterFilterBar monsters={monsters} filters={filters} onChange={setFilters} />}
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
      {filtering && results.length === 0 && <p className="meta">No monsters match the filters.</p>}
    </div>
  )
}
