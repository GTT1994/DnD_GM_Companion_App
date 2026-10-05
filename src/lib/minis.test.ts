// Tests for mini labels: how they read, tidying the form, and the tracker keeping them.

import { describe, expect, it } from 'vitest'
import type { Combatant } from '../types'
import { combatReducer, emptyCombat } from './combat'
import { cleanMini, displayName, miniText } from './minis'

const guard = (name: string): Combatant => ({
  id: name, name, initiative: 10, hp: 11, maxHp: 11, tempHp: 0, ac: 16, isPlayer: false, conditions: [],
})

describe('mini labels', () => {
  it('reads as the text, or the colour when there is no text', () => {
    expect(miniText({ text: 'with shield', colour: 'blue' })).toBe('with shield')
    expect(miniText({ text: '', colour: 'red' })).toBe('red')
    expect(displayName({ name: 'Guard 2', mini: { text: 'with shield' } })).toBe('Guard 2 (with shield)')
    expect(displayName({ name: 'Guard 3' })).toBe('Guard 3')
  })

  it('tidies the form: blank means no label', () => {
    expect(cleanMini('  red base ', undefined)).toEqual({ text: 'red base' })
    expect(cleanMini('', 'green')).toEqual({ text: '', colour: 'green' })
    expect(cleanMini('  ', undefined)).toBeNull()
  })

  it('is kept by the tracker through reset, and shows in notices', () => {
    let state = combatReducer(emptyCombat, { type: 'add', combatants: [guard('Guard 1'), guard('Guard 2')] })
    state = combatReducer(state, { type: 'setMini', id: 'Guard 2', mini: { text: 'with shield', colour: 'blue' } })
    state = combatReducer(state, { type: 'addCondition', id: 'Guard 2', condition: 'Prone', timer: { kind: 'rounds', rounds: 1 } })
    state = combatReducer(state, { type: 'nextTurn' })  // Guard 1
    state = combatReducer(state, { type: 'nextTurn' })  // Guard 2
    state = combatReducer(state, { type: 'nextTurn' })  // Guard 2's turn ends: Prone runs out
    expect(state.notices).toContain('Guard 2 (with shield) is no longer Prone')
    state = combatReducer(state, { type: 'resetCombat' })
    expect(state.combatants[1].mini).toEqual({ text: 'with shield', colour: 'blue' })
    state = combatReducer(state, { type: 'setMini', id: 'Guard 2', mini: null })
    expect(state.combatants[1].mini).toBeUndefined()
  })
})
