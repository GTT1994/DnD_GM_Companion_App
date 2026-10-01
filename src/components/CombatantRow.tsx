// Displays one combatant as a row in the combat tracker table.

import type { Combatant } from '../types'

// The props (inputs) this component accepts.
type CombatantRowProps = {
  combatant: Combatant
}

export function CombatantRow({ combatant }: CombatantRowProps) {
  return (
    <tr>
      <td>{combatant.name}</td>
      <td>{combatant.initiative}</td>
      {/* Current HP out of max HP, e.g. "25 / 30" */}
      <td>{combatant.hp} / {combatant.maxHp}</td>
      <td>{combatant.ac}</td>
      {/* Ternary works like CASE WHEN: show "Player" if isPlayer is true, otherwise "Monster" */}
      <td>{combatant.isPlayer ? 'Player' : 'Monster'}</td>
    </tr>
  )
}
