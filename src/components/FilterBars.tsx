// Filter bars for the monster and spell lists: a "Filters" button (showing how many are on) that
// opens a small grid of drop-downs and tick boxes, plus "Clear filters". The logic is in
// lib/lookupFilters.ts.

import type { ReactNode } from 'react'
import type { Monster, Spell } from '../data/srd'
import { ENVIRONMENT_LABELS, ENVIRONMENTS } from '../data/environments'
import { formatCr } from '../lib/dice'
import {
  activeMonsterFilters, activeSpellFilters, CASTING_TIME_LABELS, CR_VALUES, DAMAGE_TYPES, distinct, monsterType,
  NO_MONSTER_FILTERS, NO_SPELL_FILTERS, SIZES, type CastingTime, type DefenseFilter, type MonsterFilters, type SpellFilters,
} from '../lib/lookupFilters'
import { useSavedState } from '../lib/storage'

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

// The button and the panel it opens; the open / closed state is remembered per bar.
function FilterPanel({ id, active, onClear, children }: { id: string; active: number; onClear: () => void; children: ReactNode }) {
  const [open, setOpen] = useSavedState(`${id}-open`, false)
  return (
    <div className="filter-bar">
      <div className="filter-bar-buttons">
        <button type="button" className={`small${active ? ' selected' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>
          Filters{active ? ` (${active})` : ''} {open ? '▴' : '▾'}
        </button>
        {active > 0 && <button type="button" className="small" onClick={onClear}>Clear filters</button>}
      </div>
      {open && <div className="filter-grid">{children}</div>}
    </div>
  )
}

// A labelled drop-down with an "Any" first option.
function Choice({ label, value, onChange, options, any = 'Any' }: {
  label: string
  value: string
  onChange: (value: string) => void
  options: [string, string][]  // [value, text]
  any?: string
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{any}</option>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </label>
  )
}

function Tick({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function MonsterFilterBar({ monsters, filters, onChange }: { monsters: Monster[]; filters: MonsterFilters; onChange: (f: MonsterFilters) => void }) {
  const set = (change: Partial<MonsterFilters>) => onChange({ ...filters, ...change })
  const crs: [string, string][] = CR_VALUES.map((cr) => [`${cr}`, formatCr(cr)])
  return (
    <FilterPanel id="monster-filters" active={activeMonsterFilters(filters)} onClear={() => onChange({ ...NO_MONSTER_FILTERS, sort: filters.sort })}>
      <Choice label="Min CR" value={filters.crMin} onChange={(crMin) => set({ crMin })} options={crs} />
      <Choice label="Max CR" value={filters.crMax} onChange={(crMax) => set({ crMax })} options={crs} />
      <Choice label="Type" value={filters.type} onChange={(type) => set({ type })} options={distinct(monsters.map(monsterType)).map((t) => [t, capitalise(t)])} />
      <Choice label="Size" value={filters.size} onChange={(size) => set({ size })} options={SIZES.map((s) => [s, s])} />
      <Choice label="Environment" value={filters.environment} onChange={(environment) => set({ environment })} options={ENVIRONMENTS.map((e) => [e, ENVIRONMENT_LABELS[e]])} />
      <label>
        Sort by
        <select value={filters.sort} onChange={(e) => set({ sort: e.target.value as MonsterFilters['sort'] })}>
          <option value="name">Name</option>
          <option value="cr">CR</option>
        </select>
      </label>
      <Choice label="Damage type" value={filters.damageType} onChange={(damageType) => set({ damageType })} options={DAMAGE_TYPES.map((t) => [t, capitalise(t)])} />
      <label>
        Defence
        <select value={filters.defense} onChange={(e) => set({ defense: e.target.value as DefenseFilter })} disabled={!filters.damageType}>
          <option value="any">Resistant or immune</option>
          <option value="immune">Immune</option>
          <option value="resistant">Resistant</option>
          <option value="vulnerable">Vulnerable</option>
        </select>
      </label>
      <Tick label="Legendary" checked={filters.legendary} onChange={(legendary) => set({ legendary })} />
      <Tick label="Homebrew" checked={filters.homebrew} onChange={(homebrew) => set({ homebrew })} />
    </FilterPanel>
  )
}

export function SpellFilterBar({ spells, filters, onChange }: { spells: Spell[]; filters: SpellFilters; onChange: (f: SpellFilters) => void }) {
  const set = (change: Partial<SpellFilters>) => onChange({ ...filters, ...change })
  const levels: [string, string][] = Array.from({ length: 10 }, (_, i) => [`${i}`, i === 0 ? 'Cantrip' : `Level ${i}`])
  const saves: [string, string][] = [['attack', 'Spell attack'], ['save', 'Any save'], ...['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((a): [string, string] => [a, `${capitalise(a.toLowerCase())} save`])]
  return (
    <FilterPanel id="spell-filters" active={activeSpellFilters(filters)} onClear={() => onChange(NO_SPELL_FILTERS)}>
      <Choice label="Class" value={filters.cls} onChange={(cls) => set({ cls })} options={distinct(spells.flatMap((s) => s.classes)).map((c) => [c, c])} />
      <Choice label="Level" value={filters.level} onChange={(level) => set({ level })} options={levels} />
      <Choice label="School" value={filters.school} onChange={(school) => set({ school })} options={distinct(spells.map((s) => s.school)).map((s) => [s, s])} />
      <Choice label="Casting time" value={filters.castingTime} onChange={(castingTime) => set({ castingTime: castingTime as CastingTime | '' })} options={Object.entries(CASTING_TIME_LABELS)} />
      <Choice label="Attack / save" value={filters.attackSave} onChange={(attackSave) => set({ attackSave })} options={saves} />
      <Choice label="Damage type" value={filters.damageType} onChange={(damageType) => set({ damageType })} options={DAMAGE_TYPES.map((t) => [t, capitalise(t)])} />
      <Tick label="Concentration" checked={filters.concentration} onChange={(concentration) => set({ concentration })} />
      <Tick label="Ritual" checked={filters.ritual} onChange={(ritual) => set({ ritual })} />
    </FilterPanel>
  )
}
