// The Quick Lookup page: search conditions, monsters, spells, magic items and rules
// for the current edition, and show the chosen entry on the right.

import type { RefObject } from 'react'
import type { Edition, LookupCategory, LookupState } from '../types'
import { useSrd, type MagicItem, type Monster, type Spell, type TextEntry } from '../data/srd'
import { quickRulesFor } from '../data/quickRules'
import { formatCr } from '../lib/dice'
import { Markdown } from './Markdown'
import { StatBlock } from './StatBlock'

const CATEGORY_LABELS: Record<LookupState['category'], string> = {
  all: 'All',
  conditions: 'Conditions',
  monsters: 'Monsters',
  spells: 'Spells',
  'magic-items': 'Magic Items',
  rules: 'Rules',
}

// One row in the results list.
type ListItem = { category: LookupCategory; index: string; name: string; subtitle: string }

// How well a name matches the search: 0 = exact, 1 = starts with it, 2 = contains it.
function matchRank(name: string, query: string): number {
  const lower = name.toLowerCase()
  if (lower === query) return 0
  return lower.startsWith(query) ? 1 : 2
}

type LookupProps = {
  edition: Edition
  state: LookupState
  setState: (state: LookupState) => void
  searchRef: RefObject<HTMLInputElement | null>  // lets the ⌘K shortcut focus the search box
  onAddMonster: (monster: Monster, count: number) => void
}

export function Lookup({ edition, state, setState, searchRef, onAddMonster }: LookupProps) {
  // Each category loads on first use; null while loading.
  const conditions = useSrd(edition, 'conditions')
  const monsters = useSrd(edition, 'monsters')
  const spells = useSrd(edition, 'spells')
  const items = useSrd(edition, 'magic-items')
  const srdRules = useSrd(edition, 'rules')
  // The hand-written quick rules come first, then the full SRD rules sections (2014 only).
  const rules = [...quickRulesFor(edition), ...(srdRules ?? [])]

  // Every entry as a list row, like a UNION ALL of the category tables.
  const all: ListItem[] = [
    ...(conditions ?? []).map((c) => ({ category: 'conditions' as const, index: c.index, name: c.name, subtitle: 'Condition' })),
    ...(monsters ?? []).map((m) => ({ category: 'monsters' as const, index: m.index, name: m.name, subtitle: `CR ${formatCr(m.cr)} · ${m.meta.split(', ')[1]}` })),
    ...(spells ?? []).map((s) => ({ category: 'spells' as const, index: s.index, name: s.name, subtitle: `${s.level === 0 ? 'Cantrip' : `Level ${s.level}`} · ${s.school}` })),
    ...(items ?? []).map((i) => ({ category: 'magic-items' as const, index: i.index, name: i.name, subtitle: `${i.rarity} · ${i.category}` })),
    ...rules.map((r) => ({ category: 'rules' as const, index: r.index, name: r.name, subtitle: r.index.startsWith('quick-') ? 'Quick rule' : 'Rules section' })),
  ]

  // Filter by category and search text, like WHERE category = @category AND name LIKE '%' + @query + '%'.
  const query = state.query.trim().toLowerCase()
  const results = state.category === 'all' && query === ''
    ? []  // "All" needs some search text, or it would list everything
    : all
        .filter((item) => (state.category === 'all' || item.category === state.category) && item.name.toLowerCase().includes(query))
        // Best matches first: exact name, then names starting with the search, then the rest (ORDER BY CASE ...).
        .sort((a, b) => matchRank(a.name, query) - matchRank(b.name, query))

  const select = (item: ListItem) => setState({ ...state, selected: { category: item.category, index: item.index } })
  const isSelected = (item: ListItem) => state.selected?.category === item.category && state.selected.index === item.index

  return (
    <section className="page lookup">
      <div className="lookup-list">
        <div className="category-tabs">
          {(Object.keys(CATEGORY_LABELS) as LookupState['category'][]).map((category) => (
            <button
              key={category}
              type="button"
              className={state.category === category ? 'selected' : ''}
              onClick={() => setState({ ...state, category })}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
        <input
          ref={searchRef}
          type="search"
          className="search"
          placeholder={`Search ${CATEGORY_LABELS[state.category].toLowerCase()}… (⌘K)`}
          value={state.query}
          onChange={(e) => setState({ ...state, query: e.target.value })}
          // Enter opens the first result
          onKeyDown={(e) => e.key === 'Enter' && results[0] && select(results[0])}
          autoFocus
        />
        <ul className="results">
          {state.category === 'all' && query === '' && <li className="hint">Type to search everything.</li>}
          {state.category !== 'all' && results.length === 0 && <li className="hint">{query ? 'No matches.' : 'Loading…'}</li>}
          {results.map((item) => (
            <li key={`${item.category}/${item.index}`}>
              <button type="button" className={isSelected(item) ? 'selected' : ''} onClick={() => select(item)}>
                <span className="result-name">{item.name}</span>
                <span className="result-subtitle">{item.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="lookup-detail">
        <Detail
          selected={state.selected}
          data={{ conditions, monsters, spells, items, rules }}
          onAddMonster={onAddMonster}
        />
      </div>
    </section>
  )
}

type DetailProps = {
  selected: LookupState['selected']
  data: {
    conditions: TextEntry[] | null
    monsters: Monster[] | null
    spells: Spell[] | null
    items: MagicItem[] | null
    rules: TextEntry[]
  }
  onAddMonster: (monster: Monster, count: number) => void
}

// Shows the selected entry, using the right layout for its category.
function Detail({ selected, data, onAddMonster }: DetailProps) {
  if (!selected) return <p className="empty">Pick something from the list to see it here.</p>

  const find = <T extends { index: string }>(list: T[] | null) => list?.find((x) => x.index === selected.index)
  const notFound = <p className="empty">Not found in this edition. Try switching edition in the top right.</p>

  switch (selected.category) {
    case 'monsters': {
      const monster = find(data.monsters)
      return monster ? <StatBlock key={monster.index} monster={monster} onAdd={(n) => onAddMonster(monster, n)} /> : notFound
    }
    case 'spells': {
      const spell = find(data.spells)
      return spell ? <SpellDetail spell={spell} /> : notFound
    }
    case 'magic-items': {
      const item = find(data.items)
      if (!item) return notFound
      return (
        <article>
          <h2>{item.name}</h2>
          <p className="meta">{item.category}, {item.rarity}{item.attunement ? ' (requires attunement)' : ''}</p>
          <Markdown text={item.desc} />
        </article>
      )
    }
    case 'conditions':
    case 'rules': {
      const entry = find(selected.category === 'conditions' ? data.conditions : data.rules)
      if (!entry) return notFound
      return (
        <article>
          <h2>{entry.name}</h2>
          <Markdown text={entry.desc} />
        </article>
      )
    }
  }
}

function SpellDetail({ spell: s }: { spell: Spell }) {
  const level = s.level === 0 ? `${s.school} cantrip` : `Level ${s.level} ${s.school.toLowerCase()}`
  return (
    <article>
      <h2>{s.name}</h2>
      <p className="meta">{level}{s.ritual ? ' (ritual)' : ''}</p>
      <p className="line"><strong>Casting Time</strong> {s.castingTime}</p>
      <p className="line"><strong>Range</strong> {s.range}</p>
      <p className="line"><strong>Components</strong> {s.components}</p>
      <p className="line"><strong>Duration</strong> {s.concentration ? `Concentration, ${s.duration.replace(/^Concentration, /i, '')}` : s.duration}</p>
      <div className="rule" />
      <Markdown text={s.desc} />
      {s.higherLevel && <Markdown text={`**At Higher Levels.** ${s.higherLevel}`} />}
      <p className="meta">Classes: {s.classes.join(', ')}</p>
    </article>
  )
}
