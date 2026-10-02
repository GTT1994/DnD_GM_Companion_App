// Group saves: several creatures make the same saving throw (e.g. against a Fireball or a dragon's
// breath). Monsters roll with their stat block bonus; for PCs you tick what the players rolled.
// Optionally rolls damage once (full on a failure, half or none on a success) and adds a
// condition to everyone who failed, then applies it all to the tracker in one go.

import { useState, type Dispatch } from 'react'
import type { Ability, CombatState } from '../types'
import type { CombatAction } from '../lib/combat'
import type { D20Mode } from '../lib/actions'
import { useMonsterLookup } from '../data/srd'
import { sortByInitiative } from '../lib/combat'
import { blankDuration, toTimer } from '../lib/conditions'
import { parseDice, rollDice, signed } from '../lib/dice'
import { ABILITIES, damageAfterSave, rollSave, saveBonus, type GroupSavePreset, type OnSuccess } from '../lib/saves'
import { DurationFields } from './ConditionPicker'

type GroupSaveProps = {
  preset: GroupSavePreset
  combat: CombatState
  conditionNames: string[]
  dispatch: Dispatch<CombatAction>
  onClose: () => void
}

// One target's save: rolled for monsters; null "passed" means waiting for the player's result.
type Result = { id: string; roll?: { total: number; natural: number; rolls: number[]; bonus: number }; passed: boolean | null }

export function GroupSave({ preset, combat, conditionNames, dispatch, onClose }: GroupSaveProps) {
  const findMonster = useMonsterLookup()
  const order = sortByInitiative(combat.combatants)
  const [ability, setAbility] = useState<Ability>(preset.ability ?? 'Dex')
  const [dc, setDc] = useState(preset.dc ? String(preset.dc) : '')
  const [mode, setMode] = useState<D20Mode>('normal')
  // A monster's own breath or spell usually targets the party; from the toolbar, start with nobody.
  const [targets, setTargets] = useState<string[]>(preset.sourceId ? order.filter((c) => c.isPlayer).map((c) => c.id) : [])
  const [damage, setDamage] = useState(preset.damage ?? '')
  const [onSuccess, setOnSuccess] = useState<OnSuccess>(preset.onSuccess ?? 'half')
  const [condition, setCondition] = useState('')
  const [duration, setDuration] = useState(() => blankDuration(preset.sourceId ?? combat.activeId ?? order[0]?.id ?? ''))
  const [results, setResults] = useState<Result[] | null>(null)
  const [damageRoll, setDamageRoll] = useState<{ total: number; detail: string } | null>(null)

  const dcValue = parseInt(dc)
  const damageValid = damage.trim() === '' || parseDice(damage) !== null
  const timer = condition ? toTimer(duration) : undefined
  const canRoll = dcValue > 0 && targets.length > 0 && damageValid && timer !== null
  const nameOf = (id: string) => combat.combatants.find((c) => c.id === id)?.name ?? '?'

  function toggleTarget(id: string, on: boolean) {
    setTargets(on ? [...targets, id] : targets.filter((t) => t !== id))
  }

  function rollAll() {
    setResults(order.filter((c) => targets.includes(c.id)).map((c) => {
      const monster = c.isPlayer ? undefined : findMonster(c.monster)
      if (!monster) return { id: c.id, passed: null }
      const roll = rollSave(saveBonus(monster, ability), dcValue, mode)
      return { id: c.id, roll, passed: roll.passed }
    }))
    if (damage.trim()) {
      const r = rollDice(damage)
      setDamageRoll({ total: r.total, detail: r.rolls.length ? `[${r.rolls.join(', ')}]${r.modifier ? ` ${signed(r.modifier)}` : ''}` : '' })
    } else {
      setDamageRoll(null)
    }
  }

  const setPassed = (id: string, passed: boolean) => setResults(results!.map((r) => (r.id === id ? { ...r, passed } : r)))
  const amountFor = (r: Result) => (damageRoll && r.passed !== null ? damageAfterSave(damageRoll.total, r.passed, onSuccess) : 0)

  function apply() {
    if (!results) return
    const type = preset.damageType ? ` ${preset.damageType}` : ''
    const actions: CombatAction[] = []
    const lines: string[] = []
    for (const r of results) {
      const amount = amountFor(r)
      if (amount > 0) actions.push({ type: 'damage', id: r.id, amount })
      if (!r.passed && condition) actions.push({ type: 'addCondition', id: r.id, condition, timer: timer ?? undefined })
      const rolled = r.roll ? ` (${r.roll.total})` : ''
      const took = damageRoll ? `, takes ${amount}${type}` : ''
      lines.push(`${nameOf(r.id)}${rolled} ${r.passed ? 'saves' : 'fails'}${took}${!r.passed && condition ? `, ${condition}` : ''}`)
    }
    // The roll history shows newest first, so the heading goes in last.
    const heading = `${preset.label ?? 'Group save'}: DC ${dcValue} ${ability} save${damageRoll ? `, ${damageRoll.total}${type} damage` : ''}`
    for (const text of [...lines.reverse(), heading]) actions.push({ type: 'log', entry: { id: crypto.randomUUID(), text } })
    dispatch({ type: 'batch', actions })
    onClose()
  }

  return (
    <section className="group-save card" aria-label="Group save">
      <div className="group-save-header">
        <h3>Group save{preset.label && <span className="meta"> · {preset.label}</span>}</h3>
        <button type="button" className="remove" onClick={onClose} aria-label="Close group save">✕</button>
      </div>

      {!results ? (
        <>
          <div className="group-save-fields">
            <label>
              Ability
              <select value={ability} onChange={(e) => setAbility(e.target.value as Ability)}>
                {ABILITIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label>
              DC
              <input type="number" min={1} className="tiny-input" value={dc} onChange={(e) => setDc(e.target.value)} />
            </label>
            <label>
              Monsters roll with
              <select value={mode} onChange={(e) => setMode(e.target.value as D20Mode)}>
                <option value="normal">Normal</option>
                <option value="advantage">Advantage</option>
                <option value="disadvantage">Disadvantage</option>
              </select>
            </label>
            <label className={damageValid ? '' : 'invalid'}>
              Damage (optional)
              <input value={damage} onChange={(e) => setDamage(e.target.value)} placeholder="8d6 or 28" />
            </label>
            <label>
              On a success
              <select value={onSuccess} onChange={(e) => setOnSuccess(e.target.value as OnSuccess)} disabled={!damage.trim()}>
                <option value="half">Half damage</option>
                <option value="none">No damage</option>
              </select>
            </label>
          </div>

          <div className="group-save-targets">
            <span className="meta">Targets:</span>
            <button type="button" className="small" onClick={() => setTargets(order.filter((c) => !c.isPlayer && c.id !== preset.sourceId).map((c) => c.id))}>All monsters</button>
            <button type="button" className="small" onClick={() => setTargets(order.filter((c) => c.isPlayer).map((c) => c.id))}>All PCs</button>
            <button type="button" className="small" onClick={() => setTargets([])}>None</button>
            {order.map((c) => (
              <label key={c.id} className="checkbox target-chip">
                <input type="checkbox" checked={targets.includes(c.id)} onChange={(e) => toggleTarget(c.id, e.target.checked)} />
                {c.name}
              </label>
            ))}
          </div>

          <div className="group-save-condition">
            <label>
              On a failed save, add
              <select value={condition} onChange={(e) => setCondition(e.target.value)} aria-label="Condition on a failed save">
                <option value="">no condition</option>
                {conditionNames.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            {condition && <DurationFields value={duration} onChange={setDuration} combatants={order} />}
          </div>

          <button type="button" className="primary" onClick={rollAll} disabled={!canRoll}>Roll saves</button>
          {!canRoll && <span className="meta"> Needs a DC and at least one target.</span>}
        </>
      ) : (
        <>
          <p className="meta">
            DC {dcValue} {ability} save{mode !== 'normal' ? ` (monsters with ${mode})` : ''}
            {damageRoll && <> · <strong className="group-damage">{damageRoll.total}</strong> damage {damage} {damageRoll.detail}</>}
            {condition && <> · {condition} on a failure</>}
          </p>
          <table className="data-table group-save-results">
            <tbody>
              {results.map((r) => (
                <tr key={r.id}>
                  <td className="name-cell">{nameOf(r.id)}</td>
                  <td>
                    {r.roll
                      ? <><strong>{r.roll.total}</strong> <span className="meta">({r.roll.rolls.length > 1 ? `${r.roll.rolls.join(' & ')} → ` : ''}{r.roll.natural} {signed(r.roll.bonus)})</span></>
                      : <span className="meta">Ask the player</span>}
                  </td>
                  <td>
                    {/* Monsters' results can be flipped, e.g. for Legendary Resistance */}
                    <span className="mode-switch compact" role="group" aria-label={`${nameOf(r.id)} result`}>
                      <button type="button" className={r.passed === true ? 'selected' : ''} onClick={() => setPassed(r.id, true)}>Passed</button>
                      <button type="button" className={r.passed === false ? 'selected' : ''} onClick={() => setPassed(r.id, false)}>Failed</button>
                    </span>
                  </td>
                  <td className="group-amount">{damageRoll && r.passed !== null ? `${amountFor(r)} dmg` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="popover-buttons">
            <button type="button" className="primary" onClick={apply} disabled={results.some((r) => r.passed === null)}>Apply</button>
            <button type="button" onClick={() => setResults(null)}>Back</button>
          </div>
        </>
      )}
    </section>
  )
}
