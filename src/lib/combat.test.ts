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

describe('condition durations', () => {
  // a (20) → b (15) → c (5), round 1, a's turn.
  const next = (s: CombatState, times = 1) => Array.from({ length: times }).reduce<CombatState>((acc) => combatReducer(acc, { type: 'nextTurn' }), s)
  const conditionsOf = (s: CombatState, id: string) => s.combatants.find((x) => x.id === id)!.conditions

  it('counts rounds down at the end of the creature’s own turns', () => {
    const s = combatReducer(started, { type: 'addCondition', id: 'b', condition: 'Restrained', timer: { kind: 'rounds', rounds: 2 } })
    const afterB1 = next(s, 2)  // b's turn ends once
    expect(afterB1.combatants.find((x) => x.id === 'b')!.timers!.Restrained).toMatchObject({ rounds: 1 })
    const afterB2 = next(afterB1, 3)  // b's turn ends again → gone
    expect(conditionsOf(afterB2, 'b')).toEqual([])
    expect(afterB2.notices).toEqual(['b is no longer Restrained'])
    expect(afterB2.log?.[0].text).toBe('b is no longer Restrained')
  })

  it('does not count the turn a timer was set in', () => {
    // On b's own turn, "1 round" lasts until the end of its next turn.
    const onB = next(started)
    const s = combatReducer(onB, { type: 'addCondition', id: 'b', condition: 'Prone', timer: { kind: 'rounds', rounds: 1 } })
    expect(conditionsOf(next(s), 'b')).toEqual(['Prone'])     // this turn ends: skipped
    expect(conditionsOf(next(s, 4), 'b')).toEqual([])          // its next turn ends
  })

  it("ends at the start or end of someone else's turn", () => {
    // Set on a's turn: "until the end of a's next turn" skips this one; "until the start of c's turn" ends when c starts.
    let s = combatReducer(started, { type: 'addCondition', id: 'b', condition: 'Stunned', timer: { kind: 'turn', when: 'end', ownerId: 'a' } })
    s = combatReducer(s, { type: 'addCondition', id: 'b', condition: 'Frightened', timer: { kind: 'turn', when: 'start', ownerId: 'c' } })
    s = next(s, 2)  // a ends (skipped), b ends, c starts
    expect(conditionsOf(s, 'b')).toEqual(['Stunned'])
    expect(s.notices).toEqual(['b is no longer Frightened'])
    s = next(s)     // c ends, a's next turn starts
    expect(conditionsOf(s, 'b')).toEqual(['Stunned'])
    s = next(s)     // a's next turn ends
    expect(conditionsOf(s, 'b')).toEqual([])
  })

  it('asks for a save at the end of the creature’s turn; a success ends the condition', () => {
    let s = combatReducer(started, { type: 'addCondition', id: 'b', condition: 'Paralyzed', timer: { kind: 'save', ability: 'Wis', dc: 15 } })
    s = next(s, 2)  // b's turn ends
    expect(s.pendingSaves).toMatchObject([{ combatantId: 'b', ability: 'Wis', dc: 15, condition: 'Paralyzed', reason: 'ends' }])
    const failed = combatReducer(s, { type: 'resolveSave', saveId: s.pendingSaves![0].id, passed: false, detail: '9' })
    expect(conditionsOf(failed, 'b')).toEqual(['Paralyzed'])
    expect(failed.pendingSaves).toEqual([])
    expect(failed.log?.[0].text).toBe('b fails the Wis save (DC 15, rolled 9): still Paralyzed')
    const passed = combatReducer(s, { type: 'resolveSave', saveId: s.pendingSaves![0].id, passed: true })
    expect(conditionsOf(passed, 'b')).toEqual([])
  })

  it('removing the condition, the creature or ending combat clears timers and saves', () => {
    let s = combatReducer(started, { type: 'addCondition', id: 'b', condition: 'Paralyzed', timer: { kind: 'save', ability: 'Wis', dc: 15 } })
    s = combatReducer(s, { type: 'addCondition', id: 'c', condition: 'Stunned', timer: { kind: 'turn', when: 'end', ownerId: 'b' } })
    s = next(s, 2)
    expect(combatReducer(s, { type: 'toggleCondition', id: 'b', condition: 'Paralyzed' }).pendingSaves).toEqual([])
    const withoutB = combatReducer(s, { type: 'remove', id: 'b' })
    expect(withoutB.pendingSaves).toEqual([])
    expect(withoutB.combatants.find((x) => x.id === 'c')!.timers).toEqual({})  // b's turn will never come
    const ended = combatReducer(s, { type: 'endCombat' })
    expect(ended.pendingSaves).toEqual([])
    expect(ended.combatants.every((x) => x.conditions.length === 0)).toBe(true)
  })

  it('damage while concentrating waits for a Con save; failing it ends concentration', () => {
    let s = combatReducer(started, { type: 'concentrate', id: 'b', spell: 'Fly' })
    s = combatReducer(s, { type: 'damage', id: 'b', amount: 30 })
    expect(s.pendingSaves).toMatchObject([{ ability: 'Con', dc: 15, condition: 'Concentrating: Fly', reason: 'concentration' }])
    const kept = combatReducer(s, { type: 'resolveSave', saveId: s.pendingSaves![0].id, passed: true })
    expect(conditionsOf(kept, 'b')).toEqual(['Concentrating: Fly'])
    const lost = combatReducer(s, { type: 'resolveSave', saveId: s.pendingSaves![0].id, passed: false })
    expect(conditionsOf(lost, 'b')).toEqual([])
    expect(lost.log?.[0].text).toMatch(/loses concentration on Fly/)
  })

  it('applies a batch of changes in order', () => {
    const s = combatReducer(started, { type: 'batch', actions: [{ type: 'damage', id: 'b', amount: 4 }, { type: 'damage', id: 'c', amount: 2 }] })
    expect(s.combatants.map((x) => x.hp)).toEqual([8, 10, 6])
  })
})
