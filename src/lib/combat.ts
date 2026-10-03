// The rules of the combat tracker, as a reducer: a function that takes the current
// state and an action ("what happened") and returns the new state. Like a stored
// procedure that takes the table and a command, and returns the updated table.
// It never edits the old state, so React can tell something changed.

import type { CombatState, Combatant, ConditionTimer, LogEntry } from '../types'
import { concentrationDc, LEGENDARY_KEY } from './actions'
import { addCondition, endOfTurn, forgetRemoved, removeCondition, startOfTurn } from './conditions'

export type CombatAction =
  | { type: 'add'; combatants: Combatant[] }
  | { type: 'remove'; id: string }
  | { type: 'damage'; id: string; amount: number }
  | { type: 'heal'; id: string; amount: number }
  | { type: 'setTempHp'; id: string; amount: number }
  | { type: 'setInitiative'; id: string; initiative: number }
  | { type: 'toggleCondition'; id: string; condition: string }
  | { type: 'addCondition'; id: string; condition: string; timer?: ConditionTimer }  // add, or change its timer
  | { type: 'resolveSave'; saveId: string; passed: boolean; detail?: string }       // a waiting save was made or failed
  | { type: 'dismissSave'; saveId: string }
  | { type: 'clearNotices' }
  | { type: 'batch'; actions: CombatAction[]; label?: string }         // several changes saved together
  | { type: 'resetCombat' }                                            // run the same fight again from the start
  | { type: 'restore'; state: CombatState; note?: string }            // put back an earlier state (undo / redo)
  | { type: 'nextTurn' }
  | { type: 'previousTurn' }
  | { type: 'endCombat' }
  | { type: 'clearMonsters' }
  | { type: 'clearAll' }
  | { type: 'setUse'; id: string; key: string; used: number }        // how many times a limited ability has been used
  | { type: 'setLegendaryMax'; id: string; max: number }
  | { type: 'concentrate'; id: string; spell: string }                // start concentrating on a spell
  | { type: 'log'; entry: LogEntry }                                  // add a line to the roll history
  | { type: 'setLair'; id: string; name: string; initiative: number; actions: string[] }  // edit a lair
  | { type: 'useLairAction'; id: string; index: number | null }       // tick the lair action used this round (null = untick)
  | { type: 'setInLair'; id: string; inLair: boolean }

const LOG_LENGTH = 10       // how many rolls the history keeps
const CONCENTRATING = 'Concentrating'

export const emptyCombat: CombatState = { combatants: [], round: 0, activeId: null }

// Highest initiative first, like ORDER BY initiative DESC. Lairs lose ties; other ties keep the
// order they were added in.
export function sortByInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => b.initiative - a.initiative || Number(!!a.lair) - Number(!!b.lair))
}

// A lair with its "used" tick cleared, for a fresh fight.
const freshLair = (c: Combatant): Combatant => (c.lair ? { ...c, lair: { actions: c.lair.actions } } : c)

// Damage comes off temporary HP first, then real HP, which can't go below 0.
export function applyDamage(c: Combatant, amount: number): Combatant {
  const fromTemp = Math.min(c.tempHp, amount)
  return { ...c, tempHp: c.tempHp - fromTemp, hp: Math.max(0, c.hp - (amount - fromTemp)) }
}

// Healing can't take HP above the maximum.
export function applyHealing(c: Combatant, amount: number): Combatant {
  return { ...c, hp: Math.min(c.maxHp, c.hp + amount) }
}

// Adds a line to the top of the roll history, keeping only the most recent few.
function addLog(state: CombatState, entry: LogEntry): CombatState {
  return { ...state, log: [entry, ...(state.log ?? [])].slice(0, LOG_LENGTH) }
}

// Damage, plus a reminder in the roll history if the target is concentrating on a spell.
function damage(state: CombatState, id: string, amount: number): CombatState {
  const target = state.combatants.find((c) => c.id === id)
  const next = updateOne(state, id, (c) => applyDamage(c, amount))
  const concentrating = target?.conditions.find((name) => name.startsWith(CONCENTRATING))
  if (!target || !concentrating || amount <= 0) return next
  // A Con save waits in the tracker (roll it for a monster, ask the player for a PC).
  const dc = concentrationDc(amount)
  const withSave: CombatState = {
    ...next,
    pendingSaves: [...(next.pendingSaves ?? []), { id: crypto.randomUUID(), combatantId: id, ability: 'Con', dc, condition: concentrating, reason: 'concentration' }],
  }
  return addLog(withSave, {
    id: crypto.randomUUID(),
    text: `${target.name} took ${amount} damage while concentrating on ${concentrating.split(': ')[1] ?? 'a spell'}: Con save DC ${dc} to keep it`,
  })
}

// A waiting save has been made or failed: end the condition (or concentration) if that's the result.
function resolveSave(state: CombatState, saveId: string, passed: boolean, detail?: string): CombatState {
  const save = state.pendingSaves?.find((s) => s.id === saveId)
  const target = save && state.combatants.find((c) => c.id === save.combatantId)
  if (!save || !target) return dismissSave(state, saveId)
  const ends = save.reason === 'ends' ? passed : !passed
  let next = dismissSave(state, saveId)
  if (ends) next = removeCondition(next, target.id, save.condition)
  const outcome = save.reason === 'ends'
    ? (passed ? `no longer ${save.condition}` : `still ${save.condition}`)
    : (passed ? 'keeps concentrating' : `loses concentration on ${save.condition.split(': ')[1] ?? 'the spell'}`)
  return addLog(next, {
    id: crypto.randomUUID(),
    text: `${target.name} ${passed ? 'makes' : 'fails'} the ${save.ability} save (DC ${save.dc}${detail ? `, rolled ${detail}` : ''}): ${outcome}`,
  })
}

const dismissSave = (state: CombatState, saveId: string): CombatState =>
  ({ ...state, pendingSaves: (state.pendingSaves ?? []).filter((s) => s.id !== saveId) })

// Moving to the next turn: the outgoing creature's turn ends, then the next one's starts.
// Conditions that run out are removed, and listed for the GM (and in the roll history).
function changeTurn(state: CombatState): CombatState {
  const outgoing = state.round > 0 ? state.activeId : null
  let next = nextTurn(state)
  if (next === state) return state
  const notices: string[] = []
  if (outgoing && state.combatants.some((c) => c.id === outgoing)) {
    const ended = endOfTurn(next, outgoing)
    next = ended.state
    notices.push(...ended.notices)
  }
  if (next.activeId) {
    const started = startOfTurn(next, next.activeId)
    next = started.state
    notices.push(...started.notices)
  }
  for (const text of notices) next = addLog(next, { id: crypto.randomUUID(), text })
  return { ...startTurn(next), notices }
}

// Sets one entry in a combatant's "uses" record; 0 removes it.
function setUse(c: Combatant, key: string, used: number): Combatant {
  const uses = { ...c.uses }
  if (used > 0) uses[key] = used
  else delete uses[key]
  return { ...c, uses }
}

// Legendary actions come back at the start of the creature's turn.
function startTurn(state: CombatState): CombatState {
  return state.activeId ? updateOne(state, state.activeId, (c) => setUse(c, LEGENDARY_KEY, 0)) : state
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
  return combatants.length === 0 ? emptyCombat : forgetRemoved({ ...state, combatants, activeId })
}

export function combatReducer(state: CombatState, action: CombatAction): CombatState {
  switch (action.type) {
    case 'add':
      return { ...state, combatants: [...state.combatants, ...action.combatants] }
    case 'remove':
      return removeWhere(state, (c) => c.id === action.id)
    case 'damage':
      return damage(state, action.id, action.amount)
    case 'heal':
      return updateOne(state, action.id, (c) => applyHealing(c, action.amount))
    case 'setTempHp':
      return updateOne(state, action.id, (c) => ({ ...c, tempHp: Math.max(0, action.amount) }))
    case 'setInitiative':
      return updateOne(state, action.id, (c) => ({ ...c, initiative: action.initiative }))
    case 'toggleCondition': {
      const has = state.combatants.find((c) => c.id === action.id)?.conditions.includes(action.condition)
      return has ? removeCondition(state, action.id, action.condition) : addCondition(state, action.id, action.condition)
    }
    case 'addCondition':
      return addCondition(state, action.id, action.condition, action.timer)
    case 'resolveSave':
      return resolveSave(state, action.saveId, action.passed, action.detail)
    case 'dismissSave':
      return dismissSave(state, action.saveId)
    case 'clearNotices':
      return { ...state, notices: [] }
    case 'batch':
      return action.actions.reduce(combatReducer, state)
    case 'nextTurn':
      return changeTurn(state)
    case 'previousTurn':
      return previousTurn(state)
    case 'endCombat':
      // Keep everyone, but reset the round counter, conditions, legendary actions, waiting saves and
      // roll history. Daily uses and spell slots are kept: they only come back after a rest.
      return {
        combatants: state.combatants.map((c) => ({ ...freshLair(setUse(c, LEGENDARY_KEY, 0)), conditions: [], timers: {} })),
        round: 0,
        activeId: null,
        log: [],
        pendingSaves: [],
        notices: [],
      }
    case 'resetCombat':
      // Everyone back to full HP with no conditions, and every limited use restored; same people,
      // same initiative, round not started.
      return {
        combatants: state.combatants.map((c) => ({ ...freshLair(c), hp: c.maxHp, tempHp: 0, conditions: [], timers: {}, uses: {} })),
        round: 0,
        activeId: null,
        log: [],
        pendingSaves: [],
        notices: [],
      }
    case 'restore': {
      // The roll history isn't undone (it's a record of what was rolled); a note says what was undone.
      const restored = { ...action.state, log: state.log }
      return action.note ? addLog(restored, { id: crypto.randomUUID(), text: action.note }) : restored
    }
    case 'clearMonsters':
      return removeWhere(state, (c) => !c.isPlayer)
    case 'clearAll':
      return emptyCombat
    case 'setUse':
      return updateOne(state, action.id, (c) => setUse(c, action.key, action.used))
    case 'setLegendaryMax':
      return updateOne(state, action.id, (c) => ({ ...c, legendaryMax: Math.max(0, action.max) }))
    case 'concentrate': {
      // Only one concentration spell at a time: replace any earlier one.
      const earlier = state.combatants.find((c) => c.id === action.id)?.conditions.filter((name) => name.startsWith(CONCENTRATING)) ?? []
      const cleared = earlier.reduce((s, name) => removeCondition(s, action.id, name), state)
      return addCondition(cleared, action.id, `${CONCENTRATING}: ${action.spell}`)
    }
    case 'log':
      return addLog(state, action.entry)
    case 'setLair':
      return updateOne(state, action.id, (c) => ({
        ...c,
        name: action.name,
        initiative: action.initiative,
        // Keep the "used" tick only if that action is still in the list.
        lair: { actions: action.actions, used: c.lair?.used && c.lair.used.index < action.actions.length ? c.lair.used : undefined },
      }))
    case 'useLairAction': {
      const lair = state.combatants.find((c) => c.id === action.id)?.lair
      if (!lair) return state
      const used = action.index === null ? undefined : { index: action.index, round: state.round }
      const next = updateOne(state, action.id, (c) => ({ ...c, lair: { ...lair, used } }))
      const name = state.combatants.find((c) => c.id === action.id)!.name
      return action.index === null ? next : addLog(next, { id: crypto.randomUUID(), text: `${name}: ${lair.actions[action.index]}` })
    }
    case 'setInLair':
      return updateOne(state, action.id, (c) => ({ ...c, inLair: action.inLair }))
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
