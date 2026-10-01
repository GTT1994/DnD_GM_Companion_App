// Tests for the dice helpers.

import { describe, expect, it } from 'vitest'
import { abilityMod, formatCr, pickWeighted, roll, rollDie, signed } from './dice'

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
