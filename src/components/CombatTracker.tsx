// The combat tracker page: turn order, round counter, HP and conditions for everyone in the fight.

import { useState, type Dispatch } from 'react'
import type { CombatState, Edition } from '../types'
import { sortByInitiative, uniqueName, type CombatAction } from '../lib/combat'
import { useSrd } from '../data/srd'
import { AddCombatantForm } from './AddCombatantForm'
import { CombatantRow } from './CombatantRow'
import { MonsterPanel } from './MonsterPanel'
import { GroupSave } from './GroupSave'
import { TurnAlerts } from './TurnAlerts'
import type { GroupSavePreset } from '../lib/saves'

// Not an official condition, but GMs track it like one.
const EXTRA_CONDITIONS = ['Concentrating']

type CombatTrackerProps = {
  combat: CombatState
  dispatch: Dispatch<CombatAction>
  edition: Edition
  onOpenMonster: (edition: Edition, index: string) => void
  onAddParty?: () => void  // only given inside a campaign
}

export function CombatTracker({ combat, dispatch, edition, onOpenMonster, onAddParty }: CombatTrackerProps) {
  const conditions = useSrd(edition, 'conditions') ?? []
  const conditionNames = [...conditions.map((c) => c.name), ...EXTRA_CONDITIONS]
  // Condition descriptions without Markdown symbols, for hover tooltips.
  const conditionHelp = Object.fromEntries(conditions.map((c) => [c.name, c.desc.replace(/\*\*|^- /gm, '')]))

  const order = sortByInitiative(combat.combatants)
  const active = order.find((c) => c.id === combat.activeId)
  const hasMonsters = combat.combatants.some((c) => !c.isPlayer)

  // Which monster's actions panel is open. A click picks one; when the turn moves to a monster,
  // the panel follows it (a player's turn leaves the panel as it was).
  const activeMonsterId = active && !active.isPlayer ? active.id : null
  const [pick, setPick] = useState({ id: activeMonsterId, atTurn: combat.activeId })
  const selectedId = pick.atTurn === combat.activeId ? pick.id : (activeMonsterId ?? pick.id)
  const select = (id: string | null) => setPick({ id, atTurn: combat.activeId })
  const selected = order.find((c) => c.id === selectedId)
  // The group save form, when open (from the toolbar, or pre-filled from a monster's action or spell).
  const [groupSave, setGroupSave] = useState<{ key: string; preset: GroupSavePreset } | null>(null)
  const openGroupSave = (preset: GroupSavePreset) => setGroupSave({ key: crypto.randomUUID(), preset })

  return (
    <section className={`page combat-layout ${selected ? 'with-panel' : ''}`}>
      <div className="combat-main">
        <div className="toolbar">
          <div className="round">
            {combat.round === 0 ? 'Not started' : <>Round <strong>{combat.round}</strong>{active && <> · {active.name}'s turn</>}</>}
          </div>
          <div className="toolbar-buttons">
            {onAddParty && <button type="button" onClick={onAddParty} title="Add every party member not already in the fight">Add party</button>}
            <button type="button" onClick={() => dispatch({ type: 'previousTurn' })} disabled={combat.round === 0}>◀ Previous</button>
            <button type="button" className="primary" onClick={() => dispatch({ type: 'nextTurn' })} disabled={order.length === 0}>
              {combat.round === 0 ? 'Start combat' : 'Next turn ▶'}
            </button>
            <button type="button" onClick={() => openGroupSave({})} disabled={order.length === 0} title="Several creatures make the same saving throw">Group save</button>
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
          // In a campaign the party is added with "Add party", so the form is mostly for monsters.
          defaultIsPlayer={!onAddParty}
          // Number duplicate names, e.g. a second "Bandit" becomes "Bandit 2".
          onAdd={(c) => dispatch({ type: 'add', combatants: [{ ...c, name: uniqueName(c.name, combat.combatants) }] })}
        />

        <TurnAlerts combat={combat} dispatch={dispatch} />
        {groupSave && (
          <GroupSave
            key={groupSave.key}  // a new preset starts a fresh form
            preset={groupSave.preset}
            combat={combat}
            conditionNames={conditionNames}
            dispatch={dispatch}
            onClose={() => setGroupSave(null)}
          />
        )}

        {order.length === 0 ? (
          <p className="empty">
            No one in the fight yet. {onAddParty ? <>Use <strong>Add party</strong>, add</> : 'Add'} combatants above, or add monsters from their stat block in <strong>Quick Lookup</strong> (⌘K).
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
                  combatants={order}
                  activeId={combat.activeId}
                  dispatch={dispatch}
                  isSelected={c.id === selectedId}
                  onSelect={() => select(c.id === selectedId ? null : c.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <MonsterPanel
          key={selected.id}  // start fresh (rolls, advantage) when switching monsters
          combatant={selected}
          combat={combat}
          dispatch={dispatch}
          onClose={() => select(null)}
          onGroupSave={openGroupSave}
          onOpenStatBlock={() => selected.monster && onOpenMonster(selected.monster.edition, selected.monster.index)}
        />
      )}
    </section>
  )
}
