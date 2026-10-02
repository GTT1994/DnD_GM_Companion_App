// Adding a condition with a duration: the "+ Condition" drop-down on each tracker row opens a
// small form for how long it lasts. The duration fields are also used by the group save.

import { useState } from 'react'
import type { Ability, Combatant, ConditionTimer } from '../types'
import { blankDuration, toTimer, type DurationDraft } from '../lib/conditions'
import { ABILITIES } from '../lib/saves'

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
  onAdd: (condition: string, timer?: ConditionTimer) => void
}

// "+ Condition" drop-down; picking one opens the duration form, with Add and Cancel.
export function ConditionPicker({ self, available, combatants, defaultOwnerId, onAdd }: ConditionPickerProps) {
  const [condition, setCondition] = useState('')
  const [duration, setDuration] = useState(() => blankDuration(defaultOwnerId))
  const timer = toTimer(duration)

  function add() {
    if (!condition || timer === null) return
    onAdd(condition, timer)
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
        {available.map((name) => <option key={name}>{name}</option>)}
      </select>
      {condition && (
        <div
          className="condition-popover"
          role="dialog"
          aria-label={`${condition} on ${self.name}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
            if (e.key === 'Escape') setCondition('')
          }}
        >
          <strong>{condition}</strong>
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
