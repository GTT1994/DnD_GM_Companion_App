// Tests for the combat tracker rules.

import { describe, expect, it } from 'vitest'
import type { Combatant, CombatState } from '../types'
import { applyDamage, applyHealing, combatReducer, emptyCombat, sortByInitiative, uniqueName } from './combat'

// Builds a test combatant, filling in any fields not given.
function make(fields: Partial<Combatant> & { id: string }): Combatant {
  return { name: fields.id, hp: 10, maxHp: 10, tempHp: 0, ac: 10, initiative: 10, isPlayer: false, conditions: [], ...fields }
}

// Three combatants in initiative order a (20), b (15), c (5).
const a = make({ id: 'a', initiative: 20, isPlayer: true })
const b = make({ id: 'b', initiative: 15 })
const c = make({ id: 'c', initiative: 5 })
const started: CombatState = { combatants: [c, a, b], round: 1, activeId: 'a' }

describe('HP changes', () => {
  it('takes damage from temp HP first', () => {
    expect(applyDamage(make({ id: 'x', tempHp: 3 }), 5)).toMatchObject({ tempHp: 0, hp: 8 })
  })

  it('does not go below 0 or above max', () => {
    expect(applyDamage(make({ id: 'x' }), 50).hp).toBe(0)
    expect(applyHealing(make({ id: 'x', hp: 8 }), 50).hp).toBe(10)
  })
})

describe('turn order', () => {
  it('sorts highest initiative first', () => {
    expect(sortByInitiative([c, a, b]).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('starts round 1 at the top', () => {
    const state = combatReducer({ ...emptyCombat, combatants: [c, a, b] }, { type: 'nextTurn' })
    expect(state).toMatchObject({ round: 1, activeId: 'a' })
  })

  it('moves to the next combatant, then wraps to a new round', () => {
    let state = combatReducer(started, { type: 'nextTurn' })
    expect(state.activeId).toBe('b')
    state = combatReducer(combatReducer(state, { type: 'nextTurn' }), { type: 'nextTurn' })
    expect(state).toMatchObject({ round: 2, activeId: 'a' })
  })

  it('goes back a round when stepping back past the top', () => {
    const state = combatReducer({ ...started, round: 2 }, { type: 'previousTurn' })
    expect(state).toMatchObject({ round: 1, activeId: 'c' })
  })

  it('does not go back before the first turn', () => {
    expect(combatReducer(started, { type: 'previousTurn' })).toBe(started)
  })
})

describe('removing', () => {
  it('passes the turn on when the active combatant is removed', () => {
    const state = combatReducer(started, { type: 'remove', id: 'a' })
    expect(state.activeId).toBe('b')
  })

  it('clears monsters but keeps players', () => {
    const state = combatReducer(started, { type: 'clearMonsters' })
    expect(state.combatants.map((x) => x.id)).toEqual(['a'])
  })

  it('resets when everyone is removed', () => {
    const state = combatReducer({ ...started, combatants: [a] }, { type: 'remove', id: 'a' })
    expect(state).toEqual(emptyCombat)
  })
})

describe('conditions', () => {
  it('toggles a condition on and off', () => {
    let state = combatReducer(started, { type: 'toggleCondition', id: 'b', condition: 'Prone' })
    expect(state.combatants.find((x) => x.id === 'b')?.conditions).toEqual(['Prone'])
    state = combatReducer(state, { type: 'toggleCondition', id: 'b', condition: 'Prone' })
    expect(state.combatants.find((x) => x.id === 'b')?.conditions).toEqual([])
  })
})

describe('uniqueName', () => {
  it('numbers duplicate names', () => {
    expect(uniqueName('Goblin', [make({ id: '1', name: 'Goblin' }), make({ id: '2', name: 'Goblin 2' })])).toBe('Goblin 3')
    expect(uniqueName('Orc', [])).toBe('Orc')
  })
})
