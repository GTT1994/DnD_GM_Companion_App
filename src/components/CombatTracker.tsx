// The combat tracker page: turn order, round counter, HP and conditions for everyone in the fight.
// The toolbar stays full width at the top; selecting a monster narrows the table to the left and
// slides its actions panel in on the right.

import { useEffect, useRef, useState, type Dispatch } from 'react'
import type { CombatState, Combatant, Edition } from '../types'
import { sortByInitiative, uniqueName, type CombatAction } from '../lib/combat'
import { useMonsterLookup, useSrd } from '../data/srd'
import { combatantDefenses } from '../lib/resistances'
import { useCampaignRoute } from '../lib/appContext'
import { AddCombatantForm } from './AddCombatantForm'
import { CombatantRow } from './CombatantRow'
import { MonsterPanel } from './MonsterPanel'
import { GroupSave } from './GroupSave'
import { TurnAlerts } from './TurnAlerts'
import { InitiativePrompt } from './InitiativePrompt'
import { MoreMenu } from './MoreMenu'
import { LairForm } from './LairForm'
import { LairPanel } from './LairPanel'
import { newLair } from '../lib/lair'
import { MiniBadge } from './MiniLabel'
import type { GroupSavePreset } from '../lib/saves'

const PANEL_ANIMATION_MS = 250  // how long the panel takes to slide in or out (matches the CSS)

// Not an official condition, but GMs track it like one.
const EXTRA_CONDITIONS = ['Concentrating']

type CombatTrackerProps = {
  combat: CombatState
  dispatch: Dispatch<CombatAction>
  edition: Edition
  onOpenMonster: (edition: Edition, index: string) => void
  onAddParty?: () => void  // only given inside a campaign
  history?: { undo: () => void; redo: () => void; undoLabel?: string; redoLabel?: string }
}

export function CombatTracker({ combat, dispatch, edition, onOpenMonster, onAddParty, history }: CombatTrackerProps) {
  const conditions = useSrd(edition, 'conditions') ?? []
  const conditionNames = [...conditions.map((c) => c.name), ...EXTRA_CONDITIONS]
  // Condition descriptions without Markdown symbols, for hover tooltips.
  const conditionHelp = Object.fromEntries(conditions.map((c) => [c.name, c.desc.replace(/\*\*|^- /gm, '')]))

  const order = sortByInitiative(combat.combatants)
  // Each creature's resistances etc.: from its stat block, PC sheet and temporary conditions.
  const findMonster = useMonsterLookup()
  const defensesOf = (c: Combatant) => combatantDefenses(c, findMonster(c.monster))
  const active = order.find((c) => c.id === combat.activeId)
  const hasMonsters = combat.combatants.some((c) => !c.isPlayer)
  // The Add lair form (from More ▾).
  const [addingLair, setAddingLair] = useState(false)

  // Which monster's actions panel is open. A click picks one; when the turn moves to a monster,
  // the panel follows it (a player's turn leaves the panel as it was).
  const activeMonsterId = active && !active.isPlayer ? active.id : null
  const [pick, setPick] = useState({ id: activeMonsterId, atTurn: combat.activeId })
  const selectedId = pick.atTurn === combat.activeId ? pick.id : (activeMonsterId ?? pick.id)
  const select = (id: string | null) => setPick({ id, atTurn: combat.activeId })
  const selected = order.find((c) => c.id === selectedId)

  // While the panel slides closed it keeps showing the last monster, then empties.
  const [shownId, setShownId] = useState(selectedId)
  if (selectedId && selectedId !== shownId) setShownId(selectedId)  // a new pick shows straight away
  useEffect(() => {
    if (selectedId || !shownId) return
    const timer = setTimeout(() => setShownId(null), PANEL_ANIMATION_MS)
    return () => clearTimeout(timer)
  }, [selectedId, shownId])
  const shown = order.find((c) => c.id === (selectedId ?? shownId))

  // The sticky panel sits just under the sticky toolbar, whose height changes if its buttons wrap.
  const pageRef = useRef<HTMLElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) return
    const observer = new ResizeObserver(() => pageRef.current?.style.setProperty('--toolbar-height', `${toolbar.offsetHeight}px`))
    observer.observe(toolbar)
    return () => observer.disconnect()
  }, [])
  // The group save form, when open (from the toolbar, or pre-filled from a monster's action or spell).
  const [groupSave, setGroupSave] = useState<{ key: string; preset: GroupSavePreset } | null>(null)
  const openGroupSave = (preset: GroupSavePreset) => setGroupSave({ key: crypto.randomUUID(), preset })
  // The add form: open or closed by the GM; until they choose, it's open only while the fight is empty.
  const [addChoice, setAddChoice] = useState<boolean | null>(null)
  const adding = addChoice ?? order.length === 0
  const { base } = useCampaignRoute()
  // The initiative prompt, opened by Start combat when there are players in the fight.
  const [askingInitiative, setAskingInitiative] = useState(false)
  const players = order.filter((c) => c.isPlayer)

  function startOrNext() {
    if (combat.round === 0 && players.length > 0) setAskingInitiative(true)
    else dispatch({ type: 'nextTurn' })
  }

  // Saves the typed rolls and starts round 1, as one change (one Undo).
  function startWith(rolls: Record<string, number>) {
    setAskingInitiative(false)
    const set: CombatAction[] = Object.entries(rolls).map(([id, initiative]) => ({ type: 'setInitiative', id, initiative }))
    dispatch({ type: 'batch', label: 'start combat', actions: [...set, { type: 'nextTurn' }] })
  }

  return (
    <section className="page combat-page" ref={pageRef}>
      {/* Full width and sticky, so the buttons stay put when the panel opens or the page scrolls */}
      <div className="combat-top" ref={toolbarRef}>
        <div className="toolbar">
          <div className="round">
            {combat.round === 0 ? 'Not started' : <>Round <strong>{combat.round}</strong>{active && <> · {active.name}{active.mini && <> (<MiniBadge mini={active.mini} />)</>}'s turn</>}</>}
          </div>
          <div className="toolbar-buttons">
            <button type="button" className={adding ? 'selected' : ''} onClick={() => setAddChoice(!adding)} aria-expanded={adding}>+ Add combatant</button>
            {onAddParty && <button type="button" onClick={onAddParty} title="Add every party member not already in the fight">Add party</button>}
            <button type="button" onClick={() => dispatch({ type: 'previousTurn' })} disabled={combat.round === 0}>◀ Previous</button>
            <button type="button" className="primary" onClick={startOrNext} disabled={order.length === 0}>
              {combat.round === 0 ? 'Start combat' : 'Next turn ▶'}
            </button>
            <button type="button" onClick={() => openGroupSave({})} disabled={order.length === 0} title="Several creatures make the same saving throw">Group save</button>
            {history && (
              <>
                <button type="button" onClick={history.undo} disabled={!history.undoLabel} title={history.undoLabel ? `Undo: ${history.undoLabel} (⌘Z)` : 'Nothing to undo'} aria-label="Undo">↶ Undo</button>
                <button type="button" onClick={history.redo} disabled={!history.redoLabel} title={history.redoLabel ? `Redo: ${history.redoLabel} (⇧⌘Z)` : 'Nothing to redo'} aria-label="Redo">↷ Redo</button>
              </>
            )}
            <MoreMenu
              items={[
                { label: 'Add lair', title: 'Lair actions on initiative 20, typed in for this fight', onClick: () => setAddingLair(true) },
                { label: 'End combat', title: 'Reset the round counter and clear conditions', disabled: combat.round === 0, onClick: () => dispatch({ type: 'endCombat' }) },
                {
                  label: 'Reset combat',
                  title: 'Run the fight again: full HP, no conditions, all uses and spell slots back',
                  disabled: order.length === 0,
                  onClick: () => confirm('Reset combat: everyone back to full HP, conditions cleared, spell slots and uses restored, round not started?') && dispatch({ type: 'resetCombat' }),
                },
                { label: 'Clear NPCs', title: 'Remove everyone except players', disabled: !hasMonsters, onClick: () => dispatch({ type: 'clearMonsters' }) },
                { label: 'Clear all', danger: true, disabled: order.length === 0, onClick: () => confirm('Remove everyone from the tracker?') && dispatch({ type: 'clearAll' }) },
              ]}
            />
          </div>
        </div>
      </div>

      {adding && (
        <AddCombatantForm
          // In a campaign the party is added with "Add party", so the form is mostly for monsters.
          defaultIsPlayer={!onAddParty}
          lookupHref={`${base}/lookup`}
          onClose={() => setAddChoice(false)}
          // Number duplicate names, e.g. a second "Bandit" becomes "Bandit 2".
          onAdd={(c) => dispatch({ type: 'add', combatants: [{ ...c, name: uniqueName(c.name, combat.combatants) }] })}
        />
      )}

      {addingLair && (
        <section className="add-lair card" aria-label="Add lair">
          <div className="group-save-header">
            <h3>Add lair <span className="meta">· its lair actions happen on initiative 20, losing ties</span></h3>
            <button type="button" className="remove" onClick={() => setAddingLair(false)} aria-label="Close add lair">✕</button>
          </div>
          <LairForm
            submitLabel="Add lair"
            onSubmit={(lair) => {
              dispatch({ type: 'add', combatants: [newLair(uniqueName(lair.name, combat.combatants), lair.actions, lair.initiative)] })
              setAddingLair(false)
            }}
            onClose={() => setAddingLair(false)}
          />
        </section>
      )}

      {askingInitiative && combat.round === 0 && (
        <InitiativePrompt players={players} onStart={startWith} onClose={() => setAskingInitiative(false)} />
      )}
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

      {/* The combatants, and the actions panel beside them when a monster is selected */}
      <div className={`combat-split ${selected ? 'with-panel' : ''}`}>
        <div className="combat-main">
          {order.length === 0 ? (
            <p className="empty">
              No one in the fight yet. {onAddParty ? <>Use <strong>Add party</strong>, <strong>+ Add combatant</strong></> : <>Use <strong>+ Add combatant</strong></>}, or add monsters from their stat block in <strong>Quick Lookup</strong> (⌘K).
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
                  <th className="actions-heading">Actions</th>
                </tr>
              </thead>
              {/* One <tbody> per combatant (two lines each), highest initiative first */}
                {order.map((c) => (
                  <CombatantRow
                    key={c.id}
                    combatant={c}
                    isActive={c.id === combat.activeId}
                    conditionNames={conditionNames}
                    conditionHelp={conditionHelp}
                    combatants={order}
                    activeId={combat.activeId}
                    defenses={defensesOf(c)}
                    dispatch={dispatch}
                    isSelected={c.id === selectedId}
                    onSelect={() => select(c.id === selectedId ? null : c.id)}
                  />
                ))}
            </table>
          )}
        </div>

        {/* Stays in place while open; slides in and out. Shows the last monster while closing. */}
        <div className="panel-slot">
          {shown?.lair && (
            <LairPanel key={shown.id} lair={shown} combat={combat} dispatch={dispatch} onClose={() => select(null)} />
          )}
          {shown && !shown.lair && (
            <MonsterPanel
              key={shown.id}  // start fresh (rolls, advantage) when switching monsters
              combatant={shown}
              combat={combat}
              dispatch={dispatch}
              onClose={() => select(null)}
              onGroupSave={openGroupSave}
              defensesOf={defensesOf}
              onOpenStatBlock={() => shown.monster && onOpenMonster(shown.monster.edition, shown.monster.index)}
            />
          )}
        </div>
      </div>
    </section>
  )
}
