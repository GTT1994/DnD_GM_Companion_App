// A form for adding a player character to a campaign's party, or editing one.

import { useState } from 'react'
import type { Pc } from '../types'
import type { PcFields } from '../lib/store'

type PcFormProps = {
  pc?: Pc                              // the PC being edited; leave out to add a new one
  onSave: (fields: PcFields) => void
  onCancel: () => void
}

// The number fields, with their labels and limits.
const NUMBER_FIELDS = [
  { key: 'level', label: 'Level', min: 1, max: 20 },
  { key: 'ac', label: 'AC', min: 0, max: 40 },
  { key: 'maxHp', label: 'Max HP', min: 1, max: 999 },
  { key: 'passivePerception', label: 'Passive Perception', min: 0, max: 40 },
  { key: 'passiveInsight', label: 'Passive Insight', min: 0, max: 40 },
  { key: 'passiveInvestigation', label: 'Passive Investigation', min: 0, max: 40 },
] as const

type NumberKey = (typeof NUMBER_FIELDS)[number]['key']

export function PcForm({ pc, onSave, onCancel }: PcFormProps) {
  const [name, setName] = useState(pc?.name ?? '')
  const [playerName, setPlayerName] = useState(pc?.playerName ?? '')
  const [className, setClassName] = useState(pc?.className ?? '')
  // Number boxes as text, keyed by field name. New PCs start at level 1 and passive scores of 10.
  const [numbers, setNumbers] = useState<Record<NumberKey, string>>({
    level: String(pc?.level ?? 1),
    ac: pc ? String(pc.ac) : '',
    maxHp: pc ? String(pc.maxHp) : '',
    passivePerception: String(pc?.passivePerception ?? 10),
    passiveInsight: String(pc?.passiveInsight ?? 10),
    passiveInvestigation: String(pc?.passiveInvestigation ?? 10),
  })

  return (
    <form
      className="panel-form"
      onSubmit={(e) => {
        e.preventDefault()
        const n = (key: NumberKey) => parseInt(numbers[key])
        onSave({
          name: name.trim(), playerName: playerName.trim(), className: className.trim(),
          level: n('level'), ac: n('ac'), maxHp: n('maxHp'),
          passivePerception: n('passivePerception'), passiveInsight: n('passiveInsight'), passiveInvestigation: n('passiveInvestigation'),
        })
      }}
    >
      <label>
        Character name
        <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Player
        <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Optional" />
      </label>
      <label>
        Class
        <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. Fighter" />
      </label>
      {NUMBER_FIELDS.map((f) => (
        <label key={f.key}>
          {f.label}
          <input
            type="number"
            required
            min={f.min}
            max={f.max}
            value={numbers[f.key]}
            onChange={(e) => setNumbers({ ...numbers, [f.key]: e.target.value })}
          />
        </label>
      ))}
      <button type="submit" className="primary">{pc ? 'Save' : 'Add to party'}</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  )
}
