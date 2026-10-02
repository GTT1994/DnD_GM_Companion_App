// Adding a condition with a duration: the "+ Condition" drop-down on each tracker row opens a
// small form for how long it lasts. It also adds temporary damage defences ("Resistant: Fire" for
// Rage or Absorb Elements), and warns about conditions the creature is immune to.
// The duration fields are also used by the group save.

import { useState } from 'react'
import type { Ability, Combatant, ConditionTimer } from '../types'
import { blankDuration, toTimer, type DurationDraft } from '../lib/conditions'
import { ABILITIES } from '../lib/saves'
import { DAMAGE_TYPES } from '../lib/homebrew'
import { DEFENSE_LABELS, DEFENSES, temporaryCondition, type Defense } from '../lib/resistances'

type DurationFieldsProps = {
  value: DurationDraft
  onChange: (value: DurationDraft) => void
  combatants: Combatant[]  // for "start/end of whose turn"
  selfId?: string          // shown as "its" in the turn list
}

// How long a condition lasts: until removed, rounds, start/end of someone's turn, or save ends.
export function DurationFields({ value, onChange, combatants, selfId }: DurationFieldsProps) {
  const set = (changes: Partial<DurationDraft>) => onChange({ ...value, ...changes })
  return (
    <div className="duration-fields">
      <select value={value.kind} onChange={(e) => set({ kind: e.target.value as DurationDraft['kind'] })} aria-label="Duration">
        <option value="none">Until removed</option>
        <option value="rounds">Number of rounds</option>
        <option value="start">Until the start of a turn</option>
        <option value="end">Until the end of a turn</option>
        <option value="save">Save ends</option>
      </select>
      {value.kind === 'rounds' && (
        <input type="number" min={1} className="tiny-input" value={value.rounds} onChange={(e) => set({ rounds: e.target.value })} aria-label="Rounds" />
      )}
      {(value.kind === 'start' || value.kind === 'end') && (
        <select value={value.ownerId} onChange={(e) => set({ ownerId: e.target.value })} aria-label="Whose turn">
          {combatants.map((c) => <option key={c.id} value={c.id}>{c.id === selfId ? `its own (${c.name})` : `${c.name}'s`} next turn</option>)}
        </select>
      )}
      {value.kind === 'save' && (
        <>
          <select value={value.ability} onChange={(e) => set({ ability: e.target.value as Ability })} aria-label="Save ability">
            {ABILITIES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="number" min={1} className="tiny-input" value={value.dc} onChange={(e) => set({ dc: e.target.value })} placeholder="DC" aria-label="Save DC" />
        </>
      )}
    </div>
  )
}

type ConditionPickerProps = {
  self: Combatant
  available: string[]          // conditions it doesn't have yet
  combatants: Combatant[]      // everyone, in turn order
  defaultOwnerId: string       // whose turn "start/end of a turn" starts on (usually the active creature)
  immuneTo?: string[]          // condition immunities from its stat block
  onAdd: (condition: string, timer?: ConditionTimer) => void
}

const DEFENSE_PREFIX = 'defense:'  // drop-down values for "Resistant…", "Immune…", "Vulnerable…"

// "+ Condition" drop-down; picking one opens the duration form, with Add and Cancel.
export function ConditionPicker({ self, available, combatants, defaultOwnerId, immuneTo = [], onAdd }: ConditionPickerProps) {
  const [condition, setCondition] = useState('')
  const [damageType, setDamageType] = useState('Fire')  // for a temporary defence
  const [duration, setDuration] = useState(() => blankDuration(defaultOwnerId))
  const timer = toTimer(duration)
  const defense = condition.startsWith(DEFENSE_PREFIX) ? (condition.slice(DEFENSE_PREFIX.length) as Defense) : null
  const name = defense ? temporaryCondition(defense, damageType) : condition
  const immune = immuneTo.some((c) => c.toLowerCase() === condition.toLowerCase())

  function add() {
    if (!condition || timer === null) return
    onAdd(name, timer)
    setCondition('')
    setDuration(blankDuration(defaultOwnerId))
  }

  return (
    <>
      <select
        className="condition-select"
        value=""
        aria-label={`Add condition to ${self.name}`}
        onChange={(e) => {
          setCondition(e.target.value)
          setDuration(blankDuration(defaultOwnerId))
        }}
      >
        <option value="">+ Condition</option>
        {available.map((n) => <option key={n}>{n}</option>)}
        <optgroup label="Damage defences">
          {DEFENSES.map((d) => <option key={d} value={`${DEFENSE_PREFIX}${d}`}>{DEFENSE_LABELS[d]}…</option>)}
        </optgroup>
      </select>
      {condition && (
        <div
          className="condition-popover"
          role="dialog"
          aria-label={`${defense ? DEFENSE_LABELS[defense] : condition} on ${self.name}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
            if (e.key === 'Escape') setCondition('')
          }}
        >
          {defense ? (
            <label className="defense-type">
              <strong>{DEFENSE_LABELS[defense]} to</strong>
              <select value={damageType} onChange={(e) => setDamageType(e.target.value)} aria-label="Damage type">
                {DAMAGE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          ) : (
            <strong>{condition}</strong>
          )}
          {immune && <span className="field-error">{self.name} is immune to {condition} (stat block). Add anyway?</span>}
          <DurationFields value={duration} onChange={setDuration} combatants={combatants} selfId={self.id} />
          <div className="popover-buttons">
            <button type="button" className="primary small" onClick={add} disabled={timer === null}>Add</button>
            <button type="button" className="small" onClick={() => setCondition('')}>Cancel</button>
          </div>
        </div>
      )}
    </>
  )
}
