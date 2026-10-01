// Tests for the dice helpers.

import { describe, expect, it } from 'vitest'
import { abilityMod, addDice, formatCr, multiplyDice, parseDice, pickWeighted, roll, rollDice, rollDie, signed } from './dice'

// A fake random source that returns the given values in order, so rolls are predictable.
const sequence = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('rollDie', () => {
  it('gives 1 for the lowest random value and the max for the highest', () => {
    expect(rollDie(20, () => 0)).toBe(1)
    expect(rollDie(20, () => 0.999)).toBe(20)
  })
})

describe('roll', () => {
  it('adds the dice and the modifier', () => {
    // 0.5 on a d6 rolls a 4
    expect(roll('2d6+3', () => 0.5)).toEqual({ total: 11, rolls: [4, 4] })
  })

  it('handles a missing count and a negative modifier', () => {
    expect(roll('d20-1', sequence(0))).toEqual({ total: 0, rolls: [1] })
  })

  it('rejects text that is not dice', () => {
    expect(() => roll('fireball')).toThrow()
  })
})

describe('abilityMod', () => {
  it('rounds down', () => {
    expect(abilityMod(10)).toBe(0)
    expect(abilityMod(15)).toBe(2)
    expect(abilityMod(9)).toBe(-1)
    expect(abilityMod(1)).toBe(-5)
  })
})

describe('formatting', () => {
  it('signs numbers and writes fractional CRs', () => {
    expect(signed(3)).toBe('+3')
    expect(signed(-2)).toBe('-2')
    expect(formatCr(0.25)).toBe('1/4')
    expect(formatCr(5)).toBe('5')
  })
})

describe('pickWeighted', () => {
  it('picks according to the weights', () => {
    const weights = { a: 1, b: 3 }
    expect(pickWeighted(weights, () => 0.1)).toBe('a')
    expect(pickWeighted(weights, () => 0.5)).toBe('b')
  })
})

describe('dice expressions', () => {
  it('reads several terms and rejects text that is not dice', () => {
    expect(parseDice('8d6 + 2d8 - 1')).toEqual({ dice: [{ count: 8, sides: 6 }, { count: 2, sides: 8 }], modifier: -1 })
    expect(parseDice('fire')).toBeNull()
    expect(parseDice('2d6+')).toBeNull()
  })

  it('adds and multiplies dice', () => {
    expect(addDice('8d6', '2d6')).toBe('10d6')
    expect(addDice('1d8+3', '1d6')).toBe('1d8+1d6+3')
    expect(multiplyDice('1d10', 3)).toBe('3d10')
    expect(multiplyDice('2d6+1', 2)).toBe('4d6+1')
  })

  it('rolls every term and doubles all dice on a crit', () => {
    expect(rollDice('1d6+1d4+2', { crit: true, random: () => 0 })).toEqual({ total: 6, rolls: [1, 1, 1, 1], modifier: 2 })
  })
})
