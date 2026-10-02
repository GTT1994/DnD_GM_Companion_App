// A form for adding a player or a custom monster to the combat tracker, opened with
// "+ Add combatant" and closed with ✕. (SRD monsters are added from their stat block in Quick Lookup.)

import { useRef, useState } from 'react'
import { Link } from 'react-router'
import type { Combatant } from '../types'
import { rollDie } from '../lib/dice'

type AddCombatantFormProps = {
  // Function from the tracker to call with the new combatant when the form is submitted.
  onAdd: (newCombatant: Combatant) => void
  defaultIsPlayer: boolean  // whether the Player box starts ticked
  lookupHref: string        // Quick Lookup, for finding a monster's stat block
  onClose: () => void
}

export function AddCombatantForm({ onAdd, defaultIsPlayer, lookupHref, onClose }: AddCombatantFormProps) {
  const nameRef = useRef<HTMLInputElement>(null)
  // The box values are kept as text (boxes always give text) and converted when added.
  const [name, setName] = useState('')
  const [initiative, setInitiative] = useState('')
  const [maxHp, setMaxHp] = useState('')
  const [ac, setAc] = useState('')
  // Left as it is between adds, so adding several players (or monsters) in a row is quick.
  const [isPlayer, setIsPlayer] = useState(defaultIsPlayer)

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
    nameRef.current?.focus()  // the form stays open, ready for the next one
  }

  return (
    <section className="add-combatant card" aria-label="Add combatant">
      <div className="group-save-header">
        <h3>Add combatant <span className="meta">· or find a monster in <Link to={lookupHref}>Quick Lookup</Link> (⌘K)</span></h3>
        <button type="button" className="remove" onClick={onClose} aria-label="Close add combatant">✕</button>
      </div>
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
        <input ref={nameRef} required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
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
    </section>
  )
}
