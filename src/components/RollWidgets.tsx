// Building blocks for rolling in the monster panel: a to-hit button, a damage (or healing)
// roller with tick boxes for extra damage, and applying the result to someone in the fight.

import { useState, type Dispatch } from 'react'
import type { Combatant } from '../types'
import type { DamagePart } from '../data/srd'
import type { CombatAction } from '../lib/combat'
import { rollToHit, type D20Mode } from '../lib/actions'
import { rollDice, signed } from '../lib/dice'
import type { GroupSavePreset } from '../lib/saves'
import { displayName } from '../lib/minis'
import { adjustmentLabel, adjustParts, type Adjusted, type Defense, type Defenses } from '../lib/resistances'

// What every roll widget needs to know about the fight.
export type RollContext = {
  self: Combatant                    // the creature doing the rolling
  targets: Combatant[]               // everyone else in the fight, who damage can be applied to
  mode: D20Mode                      // advantage / disadvantage for to-hit rolls
  dispatch: Dispatch<CombatAction>
  log: (text: string) => void        // adds a line to the roll history
  openGroupSave: (preset: GroupSavePreset) => void  // opens the group save form, filled in
  defensesOf: (c: Combatant) => Defenses            // a target's resistances, immunities and vulnerabilities
}

type ToHitProps = {
  label: string                      // e.g. "Scimitar", used in the roll history
  bonus: number
  ctx: RollContext
  onRolled: (crit: boolean) => void  // tells the damage roller whether the hit was a natural 20
}

// A "To hit +4" button that shows the last result.
export function ToHit({ label, bonus, ctx, onRolled }: ToHitProps) {
  const [result, setResult] = useState<ReturnType<typeof rollToHit> | null>(null)

  function roll() {
    const r = rollToHit(bonus, ctx.mode)
    setResult(r)
    onRolled(r.natural === 20)
    const dice = r.rolls.length > 1 ? ` (rolled ${r.rolls.join(' & ')}, ${ctx.mode})` : ''
    const note = r.natural === 20 ? ' — critical hit!' : r.natural === 1 ? ' — natural 1, miss' : ''
    ctx.log(`${displayName(ctx.self)} · ${label}: ${r.total} to hit${dice}${note}`)
  }

  return (
    <div className="roll-row">
      <button type="button" className="roll" onClick={roll}>To hit {signed(bonus)}</button>
      {result && (
        <span className={`roll-result ${result.natural === 20 ? 'crit' : result.natural === 1 ? 'fumble' : ''}`}>
          <strong>{result.total}</strong>
          <span className="meta">
            {' '}({result.rolls.length > 1 ? `${result.rolls.join(' & ')} → ${result.natural}` : result.natural} {signed(bonus)})
            {result.natural === 20 && ' Critical!'}
            {result.natural === 1 && ' Natural 1'}
          </span>
        </span>
      )}
    </div>
  )
}

type DamageRollerProps = {
  label: string
  parts: DamagePart[]
  initialIncluded?: boolean[]        // which parts start ticked (defaults to all)
  crit: boolean                      // the last to-hit was a natural 20: double the dice
  onUsedCrit: () => void
  allowHalf?: boolean                // saving throw damage: offer "Apply half"
  heal?: boolean                     // roll healing instead of damage
  ctx: RollContext
}

type PartResult = { part: DamagePart; total: number; rolls: number[]; modifier: number }

// Rolls the ticked damage parts and lets you apply the total to a target.
export function DamageRoller({ label, parts, initialIncluded, crit, onUsedCrit, allowHalf, heal, ctx }: DamageRollerProps) {
  const [included, setIncluded] = useState(initialIncluded ?? parts.map(() => true))
  const [result, setResult] = useState<{ parts: PartResult[]; total: number; crit: boolean } | null>(null)

  function roll() {
    const rolled = parts
      .filter((_, i) => included[i])
      .map((part) => ({ part, ...rollDice(part.dice, { crit: crit && !heal }) }))
    const total = rolled.reduce((sum, r) => sum + r.total, 0)
    setResult({ parts: rolled, total, crit: crit && !heal })
    onUsedCrit()
    const detail = rolled.map((r) => `${r.total} ${r.part.type}`.trim()).join(' + ')
    ctx.log(`${displayName(ctx.self)} · ${label}: ${total} ${heal ? 'healing' : 'damage'}${rolled.length > 1 ? ` (${detail})` : detail ? ` ${rolled[0].part.type}` : ''}${crit && !heal ? ' — critical' : ''}`)
  }

  return (
    <div className="damage-roller">
      {/* Tick boxes only when there's more than one part to choose from */}
      {parts.length > 1 && (
        <div className="damage-parts">
          {parts.map((part, i) => (
            <label key={i} className="checkbox">
              <input
                type="checkbox"
                checked={included[i]}
                onChange={(e) => setIncluded(included.map((v, j) => (j === i ? e.target.checked : v)))}
              />
              {i > 0 && !part.alternative && '+'}{part.dice} {part.type}{part.note && <span className="meta"> ({part.note})</span>}
            </label>
          ))}
        </div>
      )}
      <div className="roll-row">
        <button type="button" className="roll" onClick={roll} disabled={!included.some(Boolean)}>
          {heal ? 'Healing' : 'Damage'} {parts.length === 1 && `${parts[0].dice}`}
          {crit && !heal && ' ×2 dice'}
        </button>
        {result && (
          <span className={`roll-result ${result.crit ? 'crit' : ''}`}>
            <strong>{result.total}</strong>
            <span className="meta">
              {' '}{result.parts.map((r) => `${r.part.type || ''} [${r.rolls.join(', ')}${r.modifier ? ` ${signed(r.modifier)}` : ''}]`.trim()).join(' + ')}
              {result.crit && ' Critical'}
            </span>
          </span>
        )}
      </div>
      {result && <ApplyToTarget parts={result.parts.map((r) => ({ total: r.total, type: r.part.type }))} allowHalf={allowHalf} heal={heal} ctx={ctx} />}
    </div>
  )
}

// "Apply to [target]" for a damage or healing result. Damage is adjusted for the target's
// resistances, immunities and vulnerabilities, part by part (e.g. slashing + fire).
function ApplyToTarget({ parts, allowHalf, heal, ctx }: { parts: { total: number; type?: string }[]; allowHalf?: boolean; heal?: boolean; ctx: RollContext }) {
  // Healing usually targets the caster's side, damage the other side; start with a sensible choice.
  const [targetId, setTargetId] = useState(heal ? ctx.self.id : (ctx.targets.find((t) => t.isPlayer)?.id ?? ''))
  const everyone = heal ? [ctx.self, ...ctx.targets] : ctx.targets
  const target = everyone.find((t) => t.id === targetId)
  const total = parts.reduce((sum, p) => sum + p.total, 0)
  const defenses = target && !heal ? ctx.defensesOf(target) : undefined
  const singleType = parts.length === 1 ? parts[0].type : undefined
  const unadjusted = (amount: number): Adjusted => ({ amount, kinds: new Set<Defense>() })
  const full = defenses ? adjustParts(parts, defenses) : unadjusted(total)
  const half = defenses ? adjustParts(parts, defenses, { half: true }) : unadjusted(Math.floor(total / 2))
  const note = (r: Adjusted) => (r.kinds.size ? ` (${adjustmentLabel(r.kinds, singleType)})` : '')

  function apply(r: Adjusted) {
    if (!target) return
    ctx.dispatch({ type: heal ? 'heal' : 'damage', id: target.id, amount: heal ? total : r.amount })
    ctx.log(heal ? `Healed ${total} to ${displayName(target)}` : `Applied ${r.amount} damage to ${displayName(target)}${note(r)}`)
  }

  return (
    <div className="roll-row apply-row">
      <select value={targetId} onChange={(e) => setTargetId(e.target.value)} aria-label="Target">
        <option value="">Choose target…</option>
        {everyone.map((t) => <option key={t.id} value={t.id}>{displayName(t)} ({t.hp}/{t.maxHp})</option>)}
      </select>
      <button type="button" disabled={!target} onClick={() => apply(full)}>{heal ? `Heal ${total}` : `Apply ${full.amount}${note(full)}`}</button>
      {allowHalf && !heal && <button type="button" disabled={!target} onClick={() => apply(half)}>Half ({half.amount}{note(half)})</button>}
    </div>
  )
}
