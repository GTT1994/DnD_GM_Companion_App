// The form for a lair in the combat tracker: its name, initiative (20 by default) and lair
// actions, one per line. Used to add a lair (from More ▾ → Add lair) and to edit one in its panel.

import { useState } from 'react'
import { LAIR_INITIATIVE, lairActionLines } from '../lib/lair'

export type LairDraft = { name: string; initiative: number; actions: string[] }

type LairFormProps = {
  initial?: LairDraft
  submitLabel: string        // "Add lair" or "Save"
  onSubmit: (lair: LairDraft) => void
  onClose: () => void
}

export function LairForm({ initial, submitLabel, onSubmit, onClose }: LairFormProps) {
  const [name, setName] = useState(initial?.name ?? 'Lair')
  const [initiative, setInitiative] = useState(`${initial?.initiative ?? LAIR_INITIATIVE}`)
  const [actions, setActions] = useState(initial?.actions.join('\n') ?? '')
  const lines = lairActionLines(actions)

  return (
    <form
      className="lair-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim() || lines.length === 0) return
        onSubmit({ name: name.trim(), initiative: parseInt(initiative) || LAIR_INITIATIVE, actions: lines })
      }}
    >
      <div className="lair-form-row">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <label>
          Initiative
          <input type="number" className="short" value={initiative} onChange={(e) => setInitiative(e.target.value)} />
        </label>
      </div>
      <label>
        Lair actions (one per line)
        <textarea
          rows={4}
          value={actions}
          onChange={(e) => setActions(e.target.value)}
          placeholder={'Magma erupts from a point on the ground within 120 feet: DC 15 Dex save or 10 (3d6) fire damage\nA tremor shakes the lair: DC 15 Dex save or be knocked prone'}
        />
      </label>
      <div className="lair-form-row">
        <button type="submit" className="primary" disabled={!name.trim() || lines.length === 0}>{submitLabel}</button>
        <button type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}
