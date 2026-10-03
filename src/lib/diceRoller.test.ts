// Tests for the dice tray's roller and for finding dice in rules text.

import { describe, expect, it } from 'vitest'
import { parseRoll, rollExpression, splitDiceText, type DiceRoll } from './diceRoller'
import type { Random } from './dice'

// A fake random source that returns the given values in order, so rolls are predictable.
const sequence = (...values: number[]): Random => {
  let i = 0
  return () => values[i++ % values.length]
}
// The random value that rolls a given face on a die.
const face = (value: number, sides: number) => (value - 0.5) / sides

const rolled = (text: string, random: Random) => rollExpression(text, undefined, random) as DiceRoll

describe('rollExpression', () => {
  it('adds dice and modifiers', () => {
    const r = rolled('3d6+2', sequence(face(1, 6), face(4, 6), face(6, 6)))
    expect(r.total).toBe(13)
    expect(r.terms.map((t) => t.text)).toEqual(['3d6', '2'])
  })

  it('subtracts dice and numbers, and reads spaces and a missing count', () => {
    expect(rolled('d8 + 2d6 - 1d4 - 1', sequence(face(5, 8), face(2, 6), face(3, 6), face(4, 4))).total).toBe(5 + 2 + 3 - 4 - 1)
  })

  it('keeps the highest or lowest dice', () => {
    const r = rolled('4d6kh3', sequence(face(1, 6), face(5, 6), face(3, 6), face(6, 6)))
    expect(r.total).toBe(14)
    expect(r.terms[0].dice!.map((d) => d.kept)).toEqual([false, true, true, true])
    expect(rolled('2d20kl1', sequence(face(15, 20), face(4, 20))).total).toBe(4)
  })

  it('turns d20 adv / dis into two d20s', () => {
    expect(rolled('d20+5 adv', sequence(face(3, 20), face(17, 20))).total).toBe(22)
    expect(rolled('1d20 dis', sequence(face(3, 20), face(17, 20))).total).toBe(3)
    expect(rolled('adv', sequence(face(3, 20), face(17, 20))).terms[0].text).toBe('2d20kh1')
  })

  it('reads d% as a d100', () => {
    expect(rolled('d%', () => 0.999).total).toBe(100)
  })

  it('keeps the label and the text as typed', () => {
    const r = rollExpression(' 8d6 ', 'Fireball') as DiceRoll
    expect(r.expression).toBe('8d6')
    expect(r.label).toBe('Fireball')
  })
})

describe('parseRoll', () => {
  it('explains text it cannot roll', () => {
    expect(parseRoll('fireball')).toMatch(/Couldn't read/)
    expect(parseRoll('2d6 3')).toMatch(/Couldn't read/)
    expect(parseRoll('')).toMatch(/Type some dice/)
    expect(parseRoll('2d6 adv')).toMatch(/need a d20/)
    expect(parseRoll('3d6kh4')).toMatch(/Can't keep 4 of 3/)
    expect(parseRoll('1000d6')).toMatch(/between 1 and 100 dice/)
    expect(parseRoll('1d1')).toMatch(/sides/)
  })
})

describe('splitDiceText', () => {
  it('finds dice and their modifiers in text', () => {
    expect(splitDiceText('takes 8d6 fire damage')).toEqual(['takes ', { dice: '8d6' }, ' fire damage'])
    expect(splitDiceText('regains 2d4 + 2 hit points')).toEqual(['regains ', { dice: '2d4 + 2' }, ' hit points'])
    expect(splitDiceText('Roll a d20.')).toEqual(['Roll a ', { dice: 'd20' }, '.'])
  })

  it("doesn't take the next dice's count as a modifier", () => {
    expect(splitDiceText('1d8 + 2d6')).toEqual([{ dice: '1d8' }, ' + ', { dice: '2d6' }])
  })

  it('leaves words alone', () => {
    expect(splitDiceText('dead and d-day, 2nd')).toEqual(['dead and d-day, 2nd'])
  })
})
