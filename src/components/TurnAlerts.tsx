// The box above the tracker after a turn change: conditions that have just ended, and saving
// throws waiting for the GM ("save ends" conditions and concentration checks). Monsters roll
// with their stat block bonus; for PCs, ask the player and press Passed or Failed.

import type { Dispatch } from 'react'
import type { CombatState, PendingSave } from '../types'
import type { CombatAction } from '../lib/combat'
import { useMonsterLookup } from '../data/srd'
import { rollSave, saveBonus } from '../lib/saves'
import { signed } from '../lib/dice'
import { displayName } from '../lib/minis'

type TurnAlertsProps = {
  combat: CombatState
  dispatch: Dispatch<CombatAction>
}

export function TurnAlerts({ combat, dispatch }: TurnAlertsProps) {
  const findMonster = useMonsterLookup()
  const notices = combat.notices ?? []
  const saves = combat.pendingSaves ?? []
  if (notices.length === 0 && saves.length === 0) return null

  return (
    <div className="turn-alerts" role="status">
      {notices.length > 0 && (
        <div className="alert-notices">
          <ul>{notices.map((text, i) => <li key={i}>{text}</li>)}</ul>
          <button type="button" className="small remove" onClick={() => dispatch({ type: 'clearNotices' })} aria-label="Dismiss">✕</button>
        </div>
      )}
      {saves.map((save) => {
        const target = combat.combatants.find((c) => c.id === save.combatantId)
        if (!target) return null
        const monster = findMonster(target.monster)
        return (
          <SaveRow
            key={save.id}
            save={save}
            name={displayName(target)}
            // Monsters with a stat block roll; PCs and hand-added creatures are asked.
            bonus={monster && !target.isPlayer ? saveBonus(monster, save.ability) : undefined}
            dispatch={dispatch}
          />
        )
      })}
    </div>
  )
}

type SaveRowProps = {
  save: PendingSave
  name: string
  bonus?: number
  dispatch: Dispatch<CombatAction>
}

function SaveRow({ save, name, bonus, dispatch }: SaveRowProps) {
  const spell = save.condition.split(': ')[1]
  const what = save.reason === 'concentration' ? `to keep concentrating${spell ? ` on ${spell}` : ''}` : `to end ${save.condition}`
  const resolve = (passed: boolean, detail?: string) => dispatch({ type: 'resolveSave', saveId: save.id, passed, detail })

  function roll() {
    const r = rollSave(bonus!, save.dc)
    resolve(r.passed, `${r.total} (${r.natural} ${signed(bonus!)})`)
  }

  return (
    <div className="alert-save">
      <span><strong>{name}</strong>: {save.ability} save DC {save.dc} {what}</span>
      <span className="alert-buttons">
        {bonus !== undefined && <button type="button" className="small primary" onClick={roll}>Roll {save.ability} save ({signed(bonus)})</button>}
        <button type="button" className="small" onClick={() => resolve(true)}>Passed</button>
        <button type="button" className="small" onClick={() => resolve(false)}>Failed</button>
        <button type="button" className="small remove" onClick={() => dispatch({ type: 'dismissSave', saveId: save.id })} aria-label="Dismiss save">✕</button>
      </span>
    </div>
  )
}
