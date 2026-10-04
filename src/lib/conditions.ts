// Condition durations: what happens to timed conditions when a turn ends or starts, and
// how a timer is described on its chip. Used by the combat reducer (combat.ts).

import type { Ability, CombatState, Combatant, ConditionTimer, PendingSave } from '../types'

// The result of a turn change: the updated fight, and lines to show the GM.
type Step = { state: CombatState; notices: string[] }

// Removes a condition, its timer and any save waiting on it.
export function removeCondition(state: CombatState, id: string, condition: string): CombatState {
  return {
    ...state,
    combatants: state.combatants.map((c) => (c.id === id ? withoutCondition(c, condition) : c)),
    pendingSaves: (state.pendingSaves ?? []).filter((s) => !(s.combatantId === id && s.condition === condition)),
  }
}

function withoutCondition(c: Combatant, condition: string): Combatant {
  const timers = { ...c.timers }
  delete timers[condition]
  return { ...c, conditions: c.conditions.filter((name) => name !== condition), timers }
}

// Adds a condition (or changes its timer if it's already there). A timer that starts during the
// turn it counts skips that turn's end, e.g. "until the end of Thorin's next turn" on Thorin's turn.
export function addCondition(state: CombatState, id: string, condition: string, timer?: ConditionTimer): CombatState {
  const started = state.round > 0
  let saved = timer
  if (timer?.kind === 'rounds') saved = { ...timer, skip: started && state.activeId === id }
  if (timer?.kind === 'turn' && timer.when === 'end') saved = { ...timer, skip: started && state.activeId === timer.ownerId }
  return {
    ...state,
    combatants: state.combatants.map((c) => {
      if (c.id !== id) return c
      const timers = { ...c.timers }
      if (saved) timers[condition] = saved
      else delete timers[condition]
      return { ...c, conditions: c.conditions.includes(condition) ? c.conditions : [...c.conditions, condition], timers }
    }),
  }
}

// The end of a creature's turn: its round counts go down, "until the end of its turn" timers it
// owns run out, and its "save ends" conditions get a save waiting for the GM.
export function endOfTurn(state: CombatState, ownerId: string): Step {
  const notices: string[] = []
  const saves: PendingSave[] = []
  const expired: [string, string][] = []  // [combatant id, condition]
  const combatants = state.combatants.map((c) => {
    const timers = { ...c.timers }
    for (const [condition, timer] of Object.entries(timers)) {
      if (timer.kind === 'save') {
        if (c.id !== ownerId) continue
        const waiting = state.pendingSaves?.some((s) => s.combatantId === c.id && s.condition === condition)
        if (!waiting) saves.push({ id: crypto.randomUUID(), combatantId: c.id, ability: timer.ability, dc: timer.dc, condition, reason: 'ends' })
        continue
      }
      // Does this turn ending count for the timer?
      const counts = timer.kind === 'rounds' ? c.id === ownerId : timer.when === 'end' && timer.ownerId === ownerId
      if (!counts) continue
      if (timer.skip) timers[condition] = { ...timer, skip: false }
      else if (timer.kind === 'rounds' && timer.rounds > 1) timers[condition] = { ...timer, rounds: timer.rounds - 1 }
      else expired.push([c.id, condition])
    }
    return { ...c, timers }
  })
  let next: CombatState = { ...state, combatants, pendingSaves: [...(state.pendingSaves ?? []), ...saves] }
  for (const [id, condition] of expired) {
    notices.push(`${nameOf(next, id)} is no longer ${condition}`)
    next = removeCondition(next, id, condition)
  }
  return { state: next, notices }
}

// The start of a creature's turn: "until the start of its next turn" timers it owns run out.
export function startOfTurn(state: CombatState, ownerId: string): Step {
  const notices: string[] = []
  let next = state
  for (const c of state.combatants) {
    for (const [condition, timer] of Object.entries(c.timers ?? {})) {
      if (timer.kind === 'turn' && timer.when === 'start' && timer.ownerId === ownerId) {
        notices.push(`${c.name} is no longer ${condition}`)
        next = removeCondition(next, c.id, condition)
      }
    }
  }
  return { state: next, notices }
}

// After combatants leave the fight: drop their waiting saves, and turn timers tied to their turns
// into "until removed" (their turn will never come).
export function forgetRemoved(state: CombatState): CombatState {
  const ids = new Set(state.combatants.map((c) => c.id))
  return {
    ...state,
    pendingSaves: (state.pendingSaves ?? []).filter((s) => ids.has(s.combatantId)),
    combatants: state.combatants.map((c) => {
      if (!c.timers) return c
      const timers = Object.fromEntries(Object.entries(c.timers).filter(([, t]) => t.kind !== 'turn' || ids.has(t.ownerId)))
      return { ...c, timers }
    }),
  }
}

const nameOf = (state: CombatState, id: string) => state.combatants.find((c) => c.id === id)?.name ?? 'Someone'

// Short text for a condition chip, e.g. "2 rds", "end of Thorin's turn", "Wis 15 ends".
export function timerLabel(timer: ConditionTimer, self: Combatant, combatants: Combatant[]): string {
  switch (timer.kind) {
    case 'rounds':
      return `${timer.rounds} rd${timer.rounds === 1 ? '' : 's'}`
    case 'turn': {
      const owner = timer.ownerId === self.id ? 'its' : `${combatants.find((c) => c.id === timer.ownerId)?.name ?? '?'}'s`
      return `${timer.when} of ${owner} turn`
    }
    case 'save':
      return `${timer.ability} ${timer.dc} ends`
  }
}

// Short chip text for the tracker: "Concentrating: Fly" → "Conc: Fly", "Resistant: Fire" → "Res: Fire".
export function shortConditionName(name: string): string {
  return name
    .replace(/^Concentrating: /, 'Conc: ')
    .replace(/^Resistant: /, 'Res: ')
    .replace(/^Immune: /, 'Imm: ')
    .replace(/^Vulnerable: /, 'Vuln: ')
}

// The small badge on a timed chip: rounds left, ▸ for "until a turn starts / ends", S for save ends.
// The full wording (timerLabel) is in the chip's hover text.
export function timerBadge(timer: ConditionTimer): string {
  if (timer.kind === 'rounds') return `${timer.rounds}`
  return timer.kind === 'turn' ? '▸' : 'S'
}

// --- The duration form -----------------------------------------------------------------

// What the duration fields hold while being filled in (text boxes stay text until used).
export type DurationDraft = {
  kind: 'none' | 'rounds' | 'start' | 'end' | 'save'
  rounds: string
  ownerId: string     // whose turn, for start/end
  ability: Ability
  dc: string
}

export const blankDuration = (ownerId: string): DurationDraft => ({ kind: 'none', rounds: '1', ownerId, ability: 'Wis', dc: '' })

// The timer for the form, undefined for "until removed", or null if a box isn't filled in properly.
export function toTimer(d: DurationDraft): ConditionTimer | undefined | null {
  switch (d.kind) {
    case 'none':
      return undefined
    case 'rounds': {
      const rounds = parseInt(d.rounds)
      return rounds > 0 ? { kind: 'rounds', rounds } : null
    }
    case 'start':
    case 'end':
      return d.ownerId ? { kind: 'turn', when: d.kind, ownerId: d.ownerId } : null
    case 'save': {
      const dc = parseInt(d.dc)
      return dc > 0 ? { kind: 'save', ability: d.ability, dc } : null
    }
  }
}
