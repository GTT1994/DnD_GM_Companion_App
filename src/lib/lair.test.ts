// Tests for lairs in the combat tracker and the mob attack rules.

import { describe, expect, it } from 'vitest'
import { combatReducer, emptyCombat, sortByInitiative } from './combat'
import { inLairTimes, lairActionLines, lairActionState, newLair } from './lair'
import { attackersPerHit, mobAttack } from './mob'
import type { Combatant } from '../types'

const fighter = (name: string, initiative: number): Combatant => ({
  id: name, name, initiative, hp: 10, maxHp: 10, tempHp: 0, ac: 12, isPlayer: true, conditions: [],
})

describe('lairs', () => {
  const lair = { ...newLair('Dragon lair', ['Magma', 'Tremor']), id: 'lair' }

  it('loses initiative ties', () => {
    const order = sortByInitiative([lair, fighter('Thorin', 20), fighter('Mira', 15)])
    expect(order.map((c) => c.name)).toEqual(['Thorin', 'Dragon lair', 'Mira'])
  })

  it("can't use the same lair action two rounds running", () => {
    let state = combatReducer(emptyCombat, { type: 'add', combatants: [lair, fighter('Thorin', 10)] })
    state = combatReducer(state, { type: 'nextTurn' })
    state = combatReducer(state, { type: 'useLairAction', id: 'lair', index: 0 })
    let c = state.combatants.find((x) => x.id === 'lair')!
    expect(lairActionState(c, 0, 1)).toBe('thisRound')
    expect(state.log?.[0].text).toBe('Dragon lair: Magma')
    // Round 2: Magma was last round.
    expect(lairActionState(c, 0, 2)).toBe('lastRound')
    expect(lairActionState(c, 1, 2)).toBe(null)
    // Round 3: free again.
    expect(lairActionState(c, 0, 3)).toBe(null)
    // Reset clears the tick.
    state = combatReducer(state, { type: 'resetCombat' })
    c = state.combatants.find((x) => x.id === 'lair')!
    expect(c.lair?.used).toBeUndefined()
  })

  it('edits the name, initiative and actions', () => {
    let state = combatReducer(emptyCombat, { type: 'add', combatants: [lair] })
    state = combatReducer(state, { type: 'setLair', id: 'lair', name: 'Crypt', initiative: 18, actions: ['Ghostly hands'] })
    expect(state.combatants[0]).toMatchObject({ name: 'Crypt', initiative: 18, lair: { actions: ['Ghostly hands'] } })
  })

  it('reads typed lines and in-lair use counts', () => {
    expect(lairActionLines('  Magma \n\nTremor\n')).toEqual(['Magma', 'Tremor'])
    expect(inLairTimes('Legendary Resistance (3/Day, or 4/Day in Lair)')).toBe(4)
    expect(inLairTimes('Legendary Resistance (3/Day)')).toBeUndefined()
  })
})

describe('mob attacks', () => {
  it("follows the DMG's table", () => {
    expect([1, 5, 6, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(attackersPerHit)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 10, 20])
  })

  it('counts hits and rolls damage for each', () => {
    // +4 to hit vs AC 15 needs 11 → 1 hit per 2 attackers; 7 goblins → 3 hits of 1d6+2 (max 8 each).
    const r = mobAttack(7, 4, 15, [{ dice: '1d6+2', type: 'Slashing' }], () => 0.999)
    expect(r).toMatchObject({ needed: 11, hits: 3, total: 24, parts: [{ type: 'Slashing', total: 24 }] })
  })

  it('needs a natural 20 when the AC is out of reach', () => {
    expect(mobAttack(19, 2, 30, [{ dice: '1d4', type: 'Piercing' }]).hits).toBe(0)
    expect(mobAttack(20, 2, 30, [{ dice: '1d4', type: 'Piercing' }]).hits).toBe(1)
  })
})
