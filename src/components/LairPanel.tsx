// The side panel in the combat tracker for a lair: its lair actions, with a Use button on each.
// On the lair's turn the GM picks one; the one used last round can't be used again this round.

import { useState, type Dispatch } from 'react'
import type { CombatState, Combatant } from '../types'
import type { CombatAction } from '../lib/combat'
import { lairActionState } from '../lib/lair'
import { LairForm } from './LairForm'
import { Markdown } from './Markdown'

type LairPanelProps = {
  lair: Combatant
  combat: CombatState
  dispatch: Dispatch<CombatAction>
  onClose: () => void
}

export function LairPanel({ lair, combat, dispatch, onClose }: LairPanelProps) {
  const [editing, setEditing] = useState(false)
  const actions = lair.lair?.actions ?? []

  return (
    <aside className="monster-panel lair-panel" aria-label={`${lair.name} actions`}>
      <header className="panel-header">
        <div>
          <h2>{lair.name}</h2>
          <p className="meta">
            Lair · initiative {lair.initiative} (loses ties) · <button type="button" className="link" onClick={() => setEditing(!editing)}>{editing ? 'Stop editing' : 'Edit'}</button>
          </p>
        </div>
        <button type="button" className="remove" onClick={onClose} aria-label="Close panel">✕</button>
      </header>

      {editing ? (
        <LairForm
          initial={{ name: lair.name, initiative: lair.initiative, actions }}
          submitLabel="Save"
          onSubmit={(draft) => {
            dispatch({ type: 'setLair', id: lair.id, ...draft })
            setEditing(false)
          }}
          onClose={() => setEditing(false)}
        />
      ) : (
        <section className="panel-section">
          <h3>Lair actions</h3>
          <p className="meta">Use one on the lair's turn. The same one can't be used two rounds in a row.</p>
          <ol className="lair-actions">
            {actions.map((text, i) => {
              const state = combat.round > 0 ? lairActionState(lair, i, combat.round) : null
              return (
                <li key={i} className={`action-card lair-action ${state ?? ''}`}>
                  <Markdown text={text} rollLabel={lair.name} />
                  {state === 'thisRound' ? (
                    <button type="button" className="small selected" onClick={() => dispatch({ type: 'useLairAction', id: lair.id, index: null })} title="Click to untick">✓ Used this round</button>
                  ) : state === 'lastRound' ? (
                    <span className="meta">Used last round</span>
                  ) : (
                    <button type="button" className="small" onClick={() => dispatch({ type: 'useLairAction', id: lair.id, index: i })} disabled={combat.round === 0}>Use</button>
                  )}
                </li>
              )
            })}
          </ol>
          {combat.round === 0 && <p className="meta">Start combat to use lair actions.</p>}
        </section>
      )}
    </aside>
  )
}
