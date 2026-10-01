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

describe('monster ability tracking', () => {
  it('records and clears uses', () => {
    let state = combatReducer(started, { type: 'setUse', id: 'b', key: 'slot:3', used: 2 })
    expect(state.combatants.find((x) => x.id === 'b')?.uses).toEqual({ 'slot:3': 2 })
    state = combatReducer(state, { type: 'setUse', id: 'b', key: 'slot:3', used: 0 })
    expect(state.combatants.find((x) => x.id === 'b')?.uses).toEqual({})
  })

  it('gives legendary actions back at the start of the creature\'s turn', () => {
    const state = combatReducer(started, { type: 'setUse', id: 'b', key: 'legendary', used: 2 })
    const next = combatReducer(state, { type: 'nextTurn' })  // a → b
    expect(next.combatants.find((x) => x.id === 'b')?.uses).toEqual({})
  })

  it('replaces an earlier concentration spell', () => {
    let state = combatReducer(started, { type: 'concentrate', id: 'b', spell: 'Hold Person' })
    state = combatReducer(state, { type: 'concentrate', id: 'b', spell: 'Fly' })
    expect(state.combatants.find((x) => x.id === 'b')?.conditions).toEqual(['Concentrating: Fly'])
  })

  it('logs a concentration check when a concentrating creature takes damage', () => {
    let state = combatReducer(started, { type: 'concentrate', id: 'b', spell: 'Fly' })
    state = combatReducer(state, { type: 'damage', id: 'b', amount: 24 })
    expect(state.log?.[0].text).toBe('b took 24 damage while concentrating on Fly: Con save DC 12 to keep it')
  })

  it('keeps only the last 10 log lines and clears them when combat ends', () => {
    let state = started
    for (let i = 0; i < 12; i++) state = combatReducer(state, { type: 'log', entry: { id: `${i}`, text: `roll ${i}` } })
    expect(state.log).toHaveLength(10)
    expect(state.log?.[0].text).toBe('roll 11')
    expect(combatReducer(state, { type: 'endCombat' }).log).toEqual([])
  })
})
