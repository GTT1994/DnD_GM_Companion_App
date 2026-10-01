// The main app component. Currently shows the combat tracker table.

import { CombatantRow } from './components/CombatantRow'
import type { Combatant } from './types'

// Sample combatants used until combatants can be added in the app.
const combatants: Combatant[] = [
  { id: '1', name: 'Thorin', hp: 34, maxHp: 34, ac: 18, initiative: 15, isPlayer: true },
  { id: '2', name: 'Jazz', hp: 20, maxHp: 39, ac: 14, initiative: 11, isPlayer: true },
  { id: '3', name: 'Astor', hp: 18, maxHp: 27, ac: 12, initiative: 19, isPlayer: true },
  { id: '4', name: 'Lucien', hp: 100, maxHp: 100, ac: 18, initiative: 19, isPlayer: false },
]

function App() {
  return (
    <main>
      <h1>Combat Tracker</h1>
      <table>
        {/* Column headings. Their order must match the cells in CombatantRow. */}
        <thead>
          <tr>
            <th>Name</th>
            <th>Init</th>
            <th>HP</th>
            <th>AC</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {/* One row per combatant, like SELECT ... FROM combatants. key = the row's unique ID. */}
          {combatants.map((combatant) => (
            <CombatantRow key={combatant.id} combatant={combatant} />
          ))}
        </tbody>
      </table>
    </main>
  )
}

export default App
