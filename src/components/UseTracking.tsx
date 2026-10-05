// Controls for limited-use abilities in the monster panel: a row of clickable "pips"
// (for X/Day uses, spell slots and legendary actions) and the Recharge / per-day controls for a trait or action.

import type { Feature } from '../data/srd'
import { featureKey } from '../lib/actions'
import { inLairTimes } from '../lib/lair'
import { displayName } from '../lib/minis'
import { rollDie } from '../lib/dice'
import type { RollContext } from './RollWidgets'

type UsePipsProps = {
  used: number
  max: number
  onChange: (used: number) => void
  label: string  // for screen readers, e.g. "3rd level slots"
}

// One pip per use: filled = still available, empty = used. Click a filled pip to use it, an empty one to get it back.
export function UsePips({ used, max, onChange, label }: UsePipsProps) {
  return (
    <span className="pips" role="group" aria-label={`${label}: ${max - used} of ${max} left`}>
      {Array.from({ length: max }, (_, i) => {
        const available = i < max - used
        return (
          <button
            key={i}
            type="button"
            className={`pip ${available ? 'available' : 'spent'}`}
            title={available ? 'Click to use' : 'Click to get back'}
            onClick={() => onChange(available ? used + 1 : used - 1)}
          />
        )
      })}
    </span>
  )
}

// Recharge, X/Day or once-per-rest tracking for a trait or action, if it has a limit.
export function FeatureUsage({ feature, ctx }: { feature: Feature; ctx: RollContext }) {
  const key = featureKey(feature.name)
  const used = ctx.self.uses?.[key] ?? 0
  const setUsed = (value: number) => ctx.dispatch({ type: 'setUse', id: ctx.self.id, key, used: value })
  const usage = feature.usage
  if (!usage) return null

  if (usage.type === 'perDay') {
    // e.g. "Legendary Resistance (3/Day, or 4/Day in Lair)" gets 4 when the monster is in its lair.
    const max = (ctx.self.inLair && inLairTimes(feature.name)) || usage.times
    return <UsePips used={used} max={max} onChange={setUsed} label={`${feature.name} uses`} />
  }

  // Recharge X–6: once used, roll a d6 at the start of the creature's turn to get it back.
  if (usage.type === 'recharge') {
    if (!used) return <button type="button" className="small" onClick={() => setUsed(1)}>Mark used</button>
    return (
      <span className="usage-controls">
        <span className="badge spent">Used</span>
        <button
          type="button"
          className="small"
          onClick={() => {
            const d6 = rollDie(6)
            const recharged = d6 >= usage.min
            if (recharged) setUsed(0)
            ctx.log(`${displayName(ctx.self)} · ${feature.name}: rolled ${d6} — ${recharged ? 'recharged!' : 'not recharged'}`)
          }}
        >
          Roll recharge
        </button>
      </span>
    )
  }

  // Recharges after a rest: a simple used / not used toggle.
  return (
    <label className="checkbox small">
      <input type="checkbox" checked={used > 0} onChange={(e) => setUsed(e.target.checked ? 1 : 0)} />
      Used
    </label>
  )
}
