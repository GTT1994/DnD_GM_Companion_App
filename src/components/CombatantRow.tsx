// Displays one combatant as a row in the combat tracker table.

import type { Combatant } from '../types'

// The props (inputs) this component accepts.
type CombatantRowProps = {
  combatant: Combatant
  // Function from App to call when this combatant's HP changes.
  onHpChange: (id: string, amount: number) => void
}

export function CombatantRow({ combatant, onHpChange }: CombatantRowProps) {
  return (
    <tr>
      <td>{combatant.name}</td>
      <td>{combatant.initiative}</td>
      {/* Current HP out of max HP, with buttons to lower or raise it by 1 */}
      <td>
        <button onClick={() => onHpChange(combatant.id, -1)}>-</button>
        {combatant.hp} / {combatant.maxHp}
        <button onClick={() => onHpChange(combatant.id, 1)}>+</button>
      </td>
      <td>{combatant.ac}</td>
      {/* Ternary works like CASE WHEN: show "Player" if isPlayer is true, otherwise "Monster" */}
      <td>{combatant.isPlayer ? 'Player' : 'Monster'}</td>
    </tr>
  )
}
