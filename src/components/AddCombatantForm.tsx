// A form for adding a player or a custom monster to the combat tracker.
// (SRD monsters are added from their stat block in Quick Lookup.)

import { useState } from 'react'
import type { Combatant } from '../types'
import { rollDie } from '../lib/dice'

type AddCombatantFormProps = {
  // Function from the tracker to call with the new combatant when the form is submitted.
  onAdd: (newCombatant: Combatant) => void
}

export function AddCombatantForm({ onAdd }: AddCombatantFormProps) {
  // The box values are kept as text (boxes always give text) and converted when added.
  const [name, setName] = useState('')
  const [initiative, setInitiative] = useState('')
  const [maxHp, setMaxHp] = useState('')
  const [ac, setAc] = useState('')
  // Left ticked between adds, so adding the whole party is quick.
  const [isPlayer, setIsPlayer] = useState(true)

  // Builds the new combatant from the boxes, sends it to the tracker, then clears the boxes.
  function handleAdd() {
    const hp = parseInt(maxHp)
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      // A blank initiative box rolls a d20.
      initiative: initiative === '' ? rollDie(20) : parseInt(initiative),
      hp,
      maxHp: hp,
      tempHp: 0,
      ac: parseInt(ac),
      isPlayer,
      conditions: [],
    })
    setName('')
    setInitiative('')
    setMaxHp('')
    setAc('')
  }

  return (
    <form
      className="add-form"
      onSubmit={(e) => {
        e.preventDefault()  // stop the browser reloading the page
        handleAdd()
      }}
    >
      {/* "required" and "min" make the browser refuse to submit missing or invalid values */}
      <label>
        Name
        <input required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Initiative
        <input type="number" value={initiative} onChange={(e) => setInitiative(e.target.value)} placeholder="Roll" className="short" />
      </label>
      <label>
        Max HP
        <input type="number" required min={1} value={maxHp} onChange={(e) => setMaxHp(e.target.value)} className="short" />
      </label>
      <label>
        AC
        <input type="number" required min={0} value={ac} onChange={(e) => setAc(e.target.value)} className="short" />
      </label>
      <label className="checkbox">
        <input type="checkbox" checked={isPlayer} onChange={(e) => setIsPlayer(e.target.checked)} />
        Player
      </label>
      {/* type="submit" means pressing Enter in any box adds the combatant */}
      <button type="submit" className="primary">Add</button>
    </form>
  )
}
