// Shown when Start combat is pressed with players in the fight: a box for each PC's initiative
// roll (monsters keep their automatic rolls). Blank boxes keep the current number; Roll rolls a d20
// for a player who isn't at the table. Enter in any box starts the fight.

import { useState } from 'react'
import type { Combatant } from '../types'
import { rollDie } from '../lib/dice'

type InitiativePromptProps = {
  players: Combatant[]
  onStart: (rolls: Record<string, number>) => void  // combatant id → new initiative
  onClose: () => void
}

export function InitiativePrompt({ players, onStart, onClose }: InitiativePromptProps) {
  const [rolls, setRolls] = useState<Record<string, string>>({})

  function start() {
    // Only the boxes with a whole number in them change anything.
    const typed = Object.entries(rolls).filter(([, text]) => text.trim() !== '' && !Number.isNaN(parseInt(text)))
    onStart(Object.fromEntries(typed.map(([id, text]) => [id, parseInt(text)])))
  }

  return (
    <form
      className="initiative-prompt card"
      aria-label="Roll for initiative"
      onSubmit={(e) => {
        e.preventDefault()
        start()
      }}
    >
      <div className="group-save-header">
        <h3>Roll for initiative <span className="meta">· type each player's roll; blank keeps the current number</span></h3>
        <button type="button" className="remove" onClick={onClose} aria-label="Close initiative">✕</button>
      </div>
      <div className="initiative-rows">
        {players.map((pc, i) => (
          <label key={pc.id} className="initiative-row">
            <span className="initiative-name">{pc.name}</span>
            <input
              type="number"
              className="tiny-input"
              autoFocus={i === 0}
              value={rolls[pc.id] ?? ''}
              placeholder={String(pc.initiative)}
              aria-label={`Initiative for ${pc.name}`}
              onChange={(e) => setRolls({ ...rolls, [pc.id]: e.target.value })}
            />
            <button type="button" className="small" onClick={() => setRolls({ ...rolls, [pc.id]: String(rollDie(20)) })} aria-label={`Roll for ${pc.name}`}>
              Roll d20
            </button>
          </label>
        ))}
      </div>
      <div className="popover-buttons">
        <button type="submit" className="primary">Start round 1</button>
        <button type="button" onClick={() => onStart({})}>Skip</button>
      </div>
    </form>
  )
}
