// Displays one combatant in the combat tracker table as two lines (a <tbody> of its own): the top
// line has initiative, name, AC, HP and [HP] [Dmg] [Heal] [⋯], in the same place on every row; the
// line underneath has its resistance tags, conditions and "+ Condition". The ⋯ menu holds temp HP,
// the damage type (for creatures with resistances, so typed-in damage is adjusted) and Remove.

import { useRef, useState, type Dispatch } from 'react'
import type { Combatant } from '../types'
import type { CombatAction } from '../lib/combat'
import { shortConditionName, timerBadge, timerLabel } from '../lib/conditions'
import { DAMAGE_TYPES } from '../lib/homebrew'
import {
  adjustDamage, adjustmentLabel, defenseTags, hasDamageDefenses, hasNonmagicalRules, type Defenses,
} from '../lib/resistances'
import { ConditionPicker } from './ConditionPicker'
import { RowMenu } from './RowMenu'
import { MiniBadge, MiniLabelForm } from './MiniLabel'
import { Popover } from './Popover'
import { anchorTo, type Anchor } from '../lib/popover'

type CombatantRowProps = {
  combatant: Combatant
  isActive: boolean                     // true when it's this combatant's turn
  isSelected: boolean                   // true when its actions panel is open
  conditionNames: string[]              // conditions that can be added
  conditionHelp: Record<string, string> // short description of each condition, shown on hover
  combatants: Combatant[]               // everyone in the fight, in turn order (for durations)
  activeId: string | null
  defenses: Defenses                    // damage resistances etc. and condition immunities
  dispatch: Dispatch<CombatAction>      // sends changes to the tracker
  onSelect: () => void                  // opens the actions panel (monsters only)
}

export function CombatantRow({ combatant: c, isActive, isSelected, conditionNames, conditionHelp, combatants, activeId, defenses, dispatch, onSelect }: CombatantRowProps) {
  // The text in the HP amount box, used by the Damage / Heal / Temp buttons.
  const [amount, setAmount] = useState('')
  const value = parseInt(amount)
  // The damage type picker (only on creatures with resistances etc.); '' = untyped, full damage.
  const [damageType, setDamageType] = useState('')
  const [magical, setMagical] = useState(false)
  const showTypes = hasDamageDefenses(defenses)
  const adjusted = !Number.isNaN(value) && damageType ? adjustDamage(value, defenses, damageType, magical) : null
  const label = adjusted ? adjustmentLabel(adjusted.kinds, damageType) : ''

  // Runs a HP action with the amount in the box, then clears the box.
  function applyAmount(type: 'damage' | 'heal' | 'setTempHp') {
    if (Number.isNaN(value)) return
    if (type === 'damage' && adjusted && label) {
      // Typed damage that a resistance, immunity or vulnerability changes: apply it with a note.
      const text = `${value} ${damageType.toLowerCase()} → ${adjusted.amount} to ${c.name} (${label})`
      dispatch({
        type: 'batch',
        label: `${adjusted.amount} ${damageType.toLowerCase()} damage to ${c.name}`,
        actions: [{ type: 'damage', id: c.id, amount: adjusted.amount }, { type: 'log', entry: { id: crypto.randomUUID(), text } }],
      })
    } else {
      dispatch({ type, id: c.id, amount: value })
    }
    setAmount('')
    setDamageType('')  // back to untyped, so the next hit isn't adjusted by mistake
  }

  // Saves a new initiative typed into the box.
  function commitInitiative(text: string) {
    const initiative = parseInt(text)
    if (!Number.isNaN(initiative) && initiative !== c.initiative) dispatch({ type: 'setInitiative', id: c.id, initiative })
  }

  // The mini label pop-up (✎ by the name, or Mini label… in the ⋯ menu), anchored to the ✎ button.
  const miniButton = useRef<HTMLButtonElement>(null)
  const [miniAt, setMiniAt] = useState<Anchor | null>(null)
  const openMini = () => setMiniAt(anchorTo(miniButton.current!, 'left'))

  // Opens the actions panel (monsters and lairs) from the name.
  const nameButton = (title: string) => <button type="button" className="link" onClick={onSelect} title={title}>{c.name}</button>
  const initiativeBox = (
    // Uncontrolled box: "key" resets it when the initiative changes elsewhere
    <input
      key={c.initiative}
      type="number"
      className="init-input"
      defaultValue={c.initiative}
      aria-label={`Initiative for ${c.name}`}
      onBlur={(e) => commitInitiative(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
  const removeItem = (close: () => void) => (
    <button type="button" className="danger" onClick={() => { close(); dispatch({ type: 'remove', id: c.id }) }}>Remove from combat</button>
  )

  // A lair has no HP, AC or conditions: one line showing the lair action used most recently.
  if (c.lair) {
    const used = c.lair.used
    return (
      <tbody className={['combatant', 'lair', isActive && 'active', isSelected && 'selected'].filter(Boolean).join(' ')}>
        <tr>
          <td className="turn-marker">{isActive ? '▶' : ''}</td>
          <td>{initiativeBox}</td>
          <td className="name-cell">
            {nameButton('Show lair actions')}
            <span className="tag lair-tag">Lair</span>
          </td>
          <td colSpan={2} className="lair-summary meta">
            {used ? `Last used (round ${used.round}): ${c.lair.actions[used.index]}` : `${c.lair.actions.length} lair action${c.lair.actions.length === 1 ? '' : 's'}`}
          </td>
          <td className="actions-cell">
            <div className="row-actions"><RowMenu name={c.name}>{removeItem}</RowMenu></div>
          </td>
        </tr>
      </tbody>
    )
  }

  const hpPercent = Math.round((c.hp / c.maxHp) * 100)
  const classes = ['combatant', isActive && 'active', isSelected && 'selected', c.hp === 0 && 'down', c.isPlayer ? 'player' : 'monster']

  return (
    <tbody className={classes.filter(Boolean).join(' ')}>
      <tr className="combatant-main">
        <td className="turn-marker">{isActive ? '▶' : ''}</td>
        <td>{initiativeBox}</td>
        <td className="name-cell">
          {/* Monsters' names open their actions panel */}
          {!c.isPlayer ? nameButton('Show actions') : c.name}
          {/* Which mini on the table it is (monsters only; players know their own) */}
          {c.mini && <MiniBadge mini={c.mini} />}
          {!c.isPlayer && (
            <button
              ref={miniButton}
              type="button"
              className={`mini-edit ${miniAt ? 'selected' : ''}`}
              aria-label={`Mini label for ${c.name}`}
              title="Which mini is this?"
              onClick={() => (miniAt ? setMiniAt(null) : openMini())}
            >
              ✎
            </button>
          )}
          {miniAt && (
            <Popover at={miniAt} align="left" label={`Mini label for ${c.name}`} className="mini-popover" opener={miniButton} onClose={() => setMiniAt(null)}>
              <MiniLabelForm name={c.name} initial={c.mini} onSave={(mini) => dispatch({ type: 'setMini', id: c.id, mini })} onClose={() => setMiniAt(null)} />
            </Popover>
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
        <td className="actions-cell">
          {/* Right-aligned, so a damage type tag on the left never moves the buttons */}
          <div className="row-actions">
            {damageType && (
              <button type="button" className="type-tag" onClick={() => setDamageType('')} title="Damage type for the next hit; click to clear">
                {damageType.toLowerCase()}{magical ? ' · magical' : ''} ✕
              </button>
            )}
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
            <button type="button" className="damage" onClick={() => applyAmount('damage')} title="Take damage (temp HP first)">
              {label ? `Dmg ${adjusted!.amount} (${label})` : 'Dmg'}
            </button>
            <button type="button" className="heal" onClick={() => applyAmount('heal')} title="Heal (up to max HP)">Heal</button>
            <RowMenu name={c.name}>
              {(close) => (
                <>
                  <button type="button" disabled={Number.isNaN(value)} onClick={() => { applyAmount('setTempHp'); close() }}>
                    {Number.isNaN(value) ? 'Set temp HP (type it in the HP box)' : `Set temp HP to ${value}`}
                  </button>
                  {showTypes && (
                    <div className="row-menu-types">
                      <label>
                        Damage type for the next hit
                        <select value={damageType} onChange={(e) => setDamageType(e.target.value)} aria-label={`Damage type for ${c.name}`}>
                          <option value="">Untyped (full damage)</option>
                          {DAMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </label>
                      {hasNonmagicalRules(defenses) && (
                        <label className="checkbox" title="Ignores resistances to nonmagical attacks">
                          <input type="checkbox" checked={magical} onChange={(e) => setMagical(e.target.checked)} aria-label="Magical" />
                          Magical attack
                        </label>
                      )}
                    </div>
                  )}
                  {!c.isPlayer && <button type="button" onClick={() => { close(); openMini() }}>Mini label…</button>}
                  {removeItem(close)}
                </>
              )}
            </RowMenu>
          </div>
        </td>
      </tr>
      {/* Second line: resistances, conditions and + Condition, across the full width */}
      <tr className="combatant-extra">
        <td className="turn-marker" />
        <td />
        <td colSpan={4}>
          <div className="row-extras">
            {hasDamageDefenses(defenses) && defenseTags(defenses).map((t) => (
              <span key={t.kind} className={`tag defense-tag ${t.kind}`} title={t.title}>{t.text}</span>
            ))}
            {/* Each condition chip shows a short duration badge, and removes itself when clicked */}
            {c.conditions.map((name) => {
              const timer = c.timers?.[name]
              const long = timer ? `${name} · ${timerLabel(timer, c, combatants)}` : name
              return (
                <button
                  key={name}
                  type="button"
                  className={`chip ${timer ? 'timed' : ''}`}
                  title={`${long}\n\n${conditionHelp[name] ?? ''}\n\nClick to remove`.replace(/\n\n\n\n/, '\n\n')}
                  aria-label={`Remove ${long}`}
                  onClick={() => dispatch({ type: 'toggleCondition', id: c.id, condition: name })}
                >
                  {shortConditionName(name)}
                  {timer && <span className="chip-badge">{timerBadge(timer)}</span>}
                </button>
              )
            })}
            <ConditionPicker
              self={c}
              available={conditionNames.filter((name) => !c.conditions.includes(name))}
              combatants={combatants}
              defaultOwnerId={activeId ?? c.id}
              immuneTo={defenses.conditionImmunities}
              onAdd={(condition, timer) => dispatch({ type: 'addCondition', id: c.id, condition, timer })}
            />
          </div>
        </td>
      </tr>
    </tbody>
  )
}
