// Tests for the condition chip labels in the combat tracker (timers are tested in combat.test.ts).

import { describe, expect, it } from 'vitest'
import { shortConditionName, timerBadge } from './conditions'

describe('chip labels', () => {
  it('shortens long condition names', () => {
    expect(shortConditionName('Concentrating: Fly')).toBe('Conc: Fly')
    expect(shortConditionName('Resistant: Fire')).toBe('Res: Fire')
    expect(shortConditionName('Prone')).toBe('Prone')
  })

  it('gives each kind of duration a short badge', () => {
    expect(timerBadge({ kind: 'rounds', rounds: 3 })).toBe('3')
    expect(timerBadge({ kind: 'turn', when: 'end', ownerId: 'x' })).toBe('▸')
    expect(timerBadge({ kind: 'save', ability: 'Wis', dc: 15 })).toBe('S')
  })
})
