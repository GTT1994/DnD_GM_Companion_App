// "Mob attack" on a monster's attack when several of that monster are in the fight: the DMG's
// mob rules give the number of hits from the d20 roll needed (target AC − attack bonus), then
// damage is rolled for each hit and can be applied to the target, adjusted for resistances.

import { useState } from 'react'
import type { Feature } from '../data/srd'
import { defaultIncluded } from '../lib/actions'
import { attackersPerHit, mobAttack, type MobResult } from '../lib/mob'
import { adjustmentLabel, adjustParts } from '../lib/resistances'
import type { RollContext } from './RollWidgets'
import { displayName } from '../lib/minis'

type MobAttackProps = {
  feature: Feature & { attack: number }
  ctx: RollContext
  mobSize: number  // how many of this monster are still standing (including this one)
}

export function MobAttack({ feature, ctx, mobSize }: MobAttackProps) {
  const [open, setOpen] = useState(false)
  const [attackers, setAttackers] = useState(`${mobSize}`)
  const [targetId, setTargetId] = useState(ctx.targets.find((t) => t.isPlayer)?.id ?? '')
  const [result, setResult] = useState<MobResult | null>(null)
  const target = ctx.targets.find((t) => t.id === targetId)
  const count = Math.max(0, parseInt(attackers) || 0)
  // The usual damage (e.g. one-handed, not the two-handed option).
  const included = defaultIncluded(feature.desc, feature.damage ?? [])
  const damage = (feature.damage ?? []).filter((_, i) => included[i])
  const needed = target ? Math.min(20, Math.max(1, target.ac - feature.attack)) : null
  const base = ctx.self.name.replace(/ \d+$/, '')  // "Goblin 3" → "Goblin"

  if (!open) return <button type="button" className="small" onClick={() => setOpen(true)} title="Several of these attack the same target (DMG mob rules)">Mob attack</button>

  const adjusted = result && target ? adjustParts(result.parts, ctx.defensesOf(target)) : null
  const note = adjusted?.kinds.size ? ` (${adjustmentLabel(adjusted.kinds, result!.parts.length === 1 ? result!.parts[0].type : undefined)})` : ''

  function apply() {
    if (!result || !target || !adjusted) return
    ctx.dispatch({
      type: 'batch',
      label: `mob attack on ${target.name}`,
      actions: [
        { type: 'damage', id: target.id, amount: adjusted.amount },
        { type: 'log', entry: { id: crypto.randomUUID(), text: `${result.attackers} × ${base} mob-attack ${displayName(target)} (${feature.name}): ${result.hits} hit${result.hits === 1 ? '' : 's'}, ${adjusted.amount} damage${note}` } },
      ],
    })
    setResult(null)
  }

  return (
    <div className="mob-attack">
      <div className="roll-row">
        <label>
          Attackers
          <input type="number" min={1} className="tiny-input" value={attackers} onChange={(e) => { setAttackers(e.target.value); setResult(null) }} />
        </label>
        <select value={targetId} onChange={(e) => { setTargetId(e.target.value); setResult(null) }} aria-label="Mob target">
          <option value="">Choose target…</option>
          {ctx.targets.map((t) => <option key={t.id} value={t.id}>{displayName(t)} (AC {t.ac})</option>)}
        </select>
        <button type="button" className="remove" onClick={() => { setOpen(false); setResult(null) }} aria-label="Close mob attack">✕</button>
      </div>
      {needed !== null && (
        <p className="meta mob-odds">
          Needs {needed}+ on the d20 → 1 hit per {attackersPerHit(needed)} attacker{attackersPerHit(needed) === 1 ? '' : 's'} → <strong>{Math.floor(count / attackersPerHit(needed))} hits</strong>
        </p>
      )}
      <div className="roll-row">
        <button type="button" className="roll" disabled={!target || count === 0} onClick={() => setResult(mobAttack(count, feature.attack, target!.ac, damage))}>Roll mob damage</button>
        {result && (
          <span className="roll-result">
            <strong>{result.total}</strong>
            <span className="meta"> {result.hits} hit{result.hits === 1 ? '' : 's'}{result.parts.length ? ` · ${result.parts.map((p) => `${p.total} ${p.type}`).join(' + ')}` : ''}</span>
          </span>
        )}
      </div>
      {result && target && adjusted && result.hits > 0 && (
        <button type="button" onClick={apply}>Apply {adjusted.amount}{note} to {target.name}</button>
      )}
    </div>
  )
}
