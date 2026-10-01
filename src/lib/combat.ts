// The rules of the combat tracker, as a reducer: a function that takes the current
// state and an action ("what happened") and returns the new state. Like a stored
// procedure that takes the table and a command, and returns the updated table.
// It never edits the old state, so React can tell something changed.

import type { CombatState, Combatant } from '../types'

export type CombatAction =
  | { type: 'add'; combatants: Combatant[] }
  | { type: 'remove'; id: string }
  | { type: 'damage'; id: string; amount: number }
  | { type: 'heal'; id: string; amount: number }
  | { type: 'setTempHp'; id: string; amount: number }
  | { type: 'setInitiative'; id: string; initiative: number }
  | { type: 'toggleCondition'; id: string; condition: string }
  | { type: 'nextTurn' }
  | { type: 'previousTurn' }
  | { type: 'endCombat' }
  | { type: 'clearMonsters' }
  | { type: 'clearAll' }

export const emptyCombat: CombatState = { combatants: [], round: 0, activeId: null }

// Highest initiative first, like ORDER BY initiative DESC. Ties keep the order they were added in.
export function sortByInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => b.initiative - a.initiative)
}

// Damage comes off temporary HP first, then real HP, which can't go below 0.
export function applyDamage(c: Combatant, amount: number): Combatant {
  const fromTemp = Math.min(c.tempHp, amount)
  return { ...c, tempHp: c.tempHp - fromTemp, hp: Math.max(0, c.hp - (amount - fromTemp)) }
}

// Healing can't take HP above the maximum.
export function applyHealing(c: Combatant, amount: number): Combatant {
  return { ...c, hp: Math.min(c.maxHp, c.hp + amount) }
}

// Applies a change to the one combatant with the given ID, leaving the others unchanged.
function updateOne(state: CombatState, id: string, change: (c: Combatant) => Combatant): CombatState {
  return { ...state, combatants: state.combatants.map((c) => (c.id === id ? change(c) : c)) }
}

// Moves the turn to the next combatant in initiative order, starting a new round after the last one.
function nextTurn(state: CombatState): CombatState {
  const order = sortByInitiative(state.combatants)
  if (order.length === 0) return state
  const index = order.findIndex((c) => c.id === state.activeId)
  // Not started yet (or the active combatant is gone): begin round 1 at the top.
  if (state.round === 0 || index === -1) {
    return { ...state, round: Math.max(1, state.round), activeId: order[0].id }
  }
  if (index === order.length - 1) return { ...state, round: state.round + 1, activeId: order[0].id }
  return { ...state, activeId: order[index + 1].id }
}

// Moves the turn back one step, going back a round when passing the top of the order.
function previousTurn(state: CombatState): CombatState {
  const order = sortByInitiative(state.combatants)
  const index = order.findIndex((c) => c.id === state.activeId)
  if (index === -1 || (index === 0 && state.round <= 1)) return state
  if (index === 0) return { ...state, round: state.round - 1, activeId: order[order.length - 1].id }
  return { ...state, activeId: order[index - 1].id }
}

// Removes combatants, passing the turn on if the active one is removed.
function removeWhere(state: CombatState, shouldRemove: (c: Combatant) => boolean): CombatState {
  const order = sortByInitiative(state.combatants)
  let activeId = state.activeId
  const active = order.find((c) => c.id === activeId)
  if (active && shouldRemove(active)) {
    // The next combatant after the active one (wrapping round) that isn't being removed.
    const start = order.indexOf(active)
    const rest = [...order.slice(start + 1), ...order.slice(0, start)]
    activeId = rest.find((c) => !shouldRemove(c))?.id ?? null
  }
  const combatants = state.combatants.filter((c) => !shouldRemove(c))
  return combatants.length === 0 ? emptyCombat : { ...state, combatants, activeId }
}

export function combatReducer(state: CombatState, action: CombatAction): CombatState {
  switch (action.type) {
    case 'add':
      return { ...state, combatants: [...state.combatants, ...action.combatants] }
    case 'remove':
      return removeWhere(state, (c) => c.id === action.id)
    case 'damage':
      return updateOne(state, action.id, (c) => applyDamage(c, action.amount))
    case 'heal':
      return updateOne(state, action.id, (c) => applyHealing(c, action.amount))
    case 'setTempHp':
      return updateOne(state, action.id, (c) => ({ ...c, tempHp: Math.max(0, action.amount) }))
    case 'setInitiative':
      return updateOne(state, action.id, (c) => ({ ...c, initiative: action.initiative }))
    case 'toggleCondition':
      return updateOne(state, action.id, (c) => ({
        ...c,
        conditions: c.conditions.includes(action.condition)
          ? c.conditions.filter((name) => name !== action.condition)
          : [...c.conditions, action.condition],
      }))
    case 'nextTurn':
      return nextTurn(state)
    case 'previousTurn':
      return previousTurn(state)
    case 'endCombat':
      // Keep everyone, but reset the round counter and clear conditions.
      return { combatants: state.combatants.map((c) => ({ ...c, conditions: [] })), round: 0, activeId: null }
    case 'clearMonsters':
      return removeWhere(state, (c) => !c.isPlayer)
    case 'clearAll':
      return emptyCombat
  }
}

// Gives a new combatant a name that isn't already taken, e.g. a second "Goblin" becomes "Goblin 2".
export function uniqueName(name: string, existing: Combatant[]): string {
  const taken = new Set(existing.map((c) => c.name))
  if (!taken.has(name)) return name
  let n = 2
  while (taken.has(`${name} ${n}`)) n++
  return `${name} ${n}`
}
