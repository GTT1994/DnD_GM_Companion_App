import type { Combatant } from '../types'

type CombatantRowProps = {
  combatant: Combatant
}

export function CombatantRow({ combatant }: CombatantRowProps) {
  return (
    <tr>
      <td>{combatant.name}</td>
      <td>{combatant.initiative}</td>
      <td>{combatant.hp} / {combatant.maxHp}</td>
      <td>{combatant.ac}</td>
      <td>{combatant.isPlayer ? 'Player' : 'Monster'}</td>
    </tr>
  )
}
