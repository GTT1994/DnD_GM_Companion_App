// The combat tracker page: turn order, round counter, HP and conditions for everyone in the fight.

import type { Dispatch } from 'react'
import type { CombatState, Edition } from '../types'
import { sortByInitiative, uniqueName, type CombatAction } from '../lib/combat'
import { useSrd } from '../data/srd'
import { AddCombatantForm } from './AddCombatantForm'
import { CombatantRow } from './CombatantRow'

// Not an official condition, but GMs track it like one.
const EXTRA_CONDITIONS = ['Concentrating']

type CombatTrackerProps = {
  combat: CombatState
  dispatch: Dispatch<CombatAction>
  edition: Edition
  onOpenMonster: (edition: Edition, index: string) => void
}

export function CombatTracker({ combat, dispatch, edition, onOpenMonster }: CombatTrackerProps) {
  const conditions = useSrd(edition, 'conditions') ?? []
  const conditionNames = [...conditions.map((c) => c.name), ...EXTRA_CONDITIONS]
  // Condition descriptions without Markdown symbols, for hover tooltips.
  const conditionHelp = Object.fromEntries(conditions.map((c) => [c.name, c.desc.replace(/\*\*|^- /gm, '')]))

  const order = sortByInitiative(combat.combatants)
  const active = order.find((c) => c.id === combat.activeId)
  const hasMonsters = combat.combatants.some((c) => !c.isPlayer)

  return (
    <section className="page">
      <div className="toolbar">
        <div className="round">
          {combat.round === 0 ? 'Not started' : <>Round <strong>{combat.round}</strong>{active && <> · {active.name}'s turn</>}</>}
        </div>
        <div className="toolbar-buttons">
          <button type="button" onClick={() => dispatch({ type: 'previousTurn' })} disabled={combat.round === 0}>◀ Previous</button>
          <button type="button" className="primary" onClick={() => dispatch({ type: 'nextTurn' })} disabled={order.length === 0}>
            {combat.round === 0 ? 'Start combat' : 'Next turn ▶'}
          </button>
          <button type="button" onClick={() => dispatch({ type: 'endCombat' })} disabled={combat.round === 0} title="Reset the round counter and clear conditions">End combat</button>
          <button type="button" onClick={() => dispatch({ type: 'clearMonsters' })} disabled={!hasMonsters} title="Remove everyone except players">Clear NPCs</button>
          <button
            type="button"
            className="danger"
            disabled={order.length === 0}
            onClick={() => confirm('Remove everyone from the tracker?') && dispatch({ type: 'clearAll' })}
          >
            Clear all
          </button>
        </div>
      </div>

      <AddCombatantForm
        // Number duplicate names, e.g. a second "Bandit" becomes "Bandit 2".
        onAdd={(c) => dispatch({ type: 'add', combatants: [{ ...c, name: uniqueName(c.name, combat.combatants) }] })}
      />

      {order.length === 0 ? (
        <p className="empty">
          No one in the fight yet. Add players above, or add monsters from their stat block in <strong>Quick Lookup</strong>.
        </p>
      ) : (
        <table className="tracker">
          <thead>
            <tr>
              <th></th>
              <th>Init</th>
              <th>Name</th>
              <th>AC</th>
              <th>HP</th>
              <th>Conditions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* One row per combatant, highest initiative first */}
            {order.map((c) => (
              <CombatantRow
                key={c.id}
                combatant={c}
                isActive={c.id === combat.activeId}
                conditionNames={conditionNames}
                conditionHelp={conditionHelp}
                dispatch={dispatch}
                onOpenMonster={() => c.monster && onOpenMonster(c.monster.edition, c.monster.index)}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
