// Displays one combatant as a row in the combat tracker table, with controls for
// initiative, HP, conditions and removing them.

import { useState, type Dispatch } from 'react'
import type { Combatant } from '../types'
import type { CombatAction } from '../lib/combat'

type CombatantRowProps = {
  combatant: Combatant
  isActive: boolean                     // true when it's this combatant's turn
  isSelected: boolean                   // true when its actions panel is open
  conditionNames: string[]              // conditions that can be added
  conditionHelp: Record<string, string> // short description of each condition, shown on hover
  dispatch: Dispatch<CombatAction>      // sends changes to the tracker
  onSelect: () => void                  // opens the actions panel (monsters only)
}

export function CombatantRow({ combatant: c, isActive, isSelected, conditionNames, conditionHelp, dispatch, onSelect }: CombatantRowProps) {
  // The text in the HP amount box, used by the Damage / Heal / Temp buttons.
  const [amount, setAmount] = useState('')
  const value = parseInt(amount)

  // Runs a HP action with the amount in the box, then clears the box.
  function applyAmount(type: 'damage' | 'heal' | 'setTempHp') {
    if (Number.isNaN(value)) return
    dispatch({ type, id: c.id, amount: value })
    setAmount('')
  }

  // Saves a new initiative typed into the box.
  function commitInitiative(text: string) {
    const initiative = parseInt(text)
    if (!Number.isNaN(initiative) && initiative !== c.initiative) dispatch({ type: 'setInitiative', id: c.id, initiative })
  }

  const hpPercent = Math.round((c.hp / c.maxHp) * 100)
  const classes = ['combatant', isActive && 'active', isSelected && 'selected', c.hp === 0 && 'down', c.isPlayer ? 'player' : 'monster']

  return (
    <tr className={classes.filter(Boolean).join(' ')}>
      <td className="turn-marker">{isActive ? '▶' : ''}</td>
      <td>
        {/* Uncontrolled box: "key" resets it when the initiative changes elsewhere */}
        <input
          key={c.initiative}
          type="number"
          className="init-input"
          defaultValue={c.initiative}
          aria-label={`Initiative for ${c.name}`}
          onBlur={(e) => commitInitiative(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </td>
      <td className="name-cell">
        {/* Monsters' names open their actions panel */}
        {!c.isPlayer ? (
          <button type="button" className="link" onClick={onSelect} title="Show actions">{c.name}</button>
        ) : (
          c.name
        )}
        <span className="tag">{c.isPlayer ? 'PC' : 'NPC'}</span>
      </td>
      <td className="ac">{c.ac}</td>
      <td className="hp-cell">
        <div className="hp-text">
          <strong>{c.hp}</strong> / {c.maxHp}
          {c.tempHp > 0 && <span className="temp-hp"> +{c.tempHp} temp</span>}
          {c.hp === 0 && <span className="down-label"> Down</span>}
        </div>
        {/* Bar coloured by how hurt the combatant is */}
        <div className="hp-bar">
          <div className={`hp-fill ${hpPercent <= 25 ? 'low' : hpPercent <= 50 ? 'mid' : ''}`} style={{ width: `${hpPercent}%` }} />
        </div>
      </td>
      <td>
        <div className="conditions">
          {/* Each condition chip removes itself when clicked */}
          {c.conditions.map((name) => (
            <button
              key={name}
              type="button"
              className="chip"
              title={`${conditionHelp[name] ?? name}\n\nClick to remove`}
              onClick={() => dispatch({ type: 'toggleCondition', id: c.id, condition: name })}
            >
              {name} ✕
            </button>
          ))}
          <select
            className="condition-select"
            value=""
            aria-label={`Add condition to ${c.name}`}
            onChange={(e) => dispatch({ type: 'toggleCondition', id: c.id, condition: e.target.value })}
          >
            <option value="">+ Condition</option>
            {conditionNames
              .filter((name) => !c.conditions.includes(name))
              .map((name) => <option key={name}>{name}</option>)}
          </select>
        </div>
      </td>
      <td className="actions-cell">
        <input
          type="number"
          min={0}
          className="amount-input"
          placeholder="HP"
          value={amount}
          aria-label={`HP amount for ${c.name}`}
          onChange={(e) => setAmount(e.target.value)}
          // Enter applies damage, the most common action
          onKeyDown={(e) => e.key === 'Enter' && applyAmount('damage')}
        />
        <button type="button" className="damage" onClick={() => applyAmount('damage')} title="Take damage (temp HP first)">Dmg</button>
        <button type="button" className="heal" onClick={() => applyAmount('heal')} title="Heal (up to max HP)">Heal</button>
        <button type="button" onClick={() => applyAmount('setTempHp')} title="Set temporary HP">Temp</button>
        <button type="button" className="remove" onClick={() => dispatch({ type: 'remove', id: c.id })} title="Remove from combat" aria-label={`Remove ${c.name}`}>✕</button>
      </td>
    </tr>
  )
}
