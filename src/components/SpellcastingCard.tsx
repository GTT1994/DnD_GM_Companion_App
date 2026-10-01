// A monster's Spellcasting trait or action in the monster panel: save DC and attack bonus,
// spell slots, and each spell with a Cast button, uses, details and rolls.

import { useState } from 'react'
import type { Feature, Monster, MonsterSpell, Spell, Spellcasting } from '../data/srd'
import {
  availableSlotLevels, slotKey, spellAttackBonus, spellDamageDice, spellHealDice, spellKey,
} from '../lib/actions'
import { abilityMod, signed } from '../lib/dice'
import { Markdown } from './Markdown'
import { DamageRoller, ToHit, type RollContext } from './RollWidgets'
import { FeatureUsage, UsePips } from './UseTracking'

const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

// 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th"…
const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`

type SpellcastingCardProps = {
  feature: Feature & { spellcasting: Spellcasting }
  monster: Monster
  spells: Spell[] | null  // the edition's spell list, for details and damage
  ctx: RollContext
}

export function SpellcastingCard({ feature, monster, spells, ctx }: SpellcastingCardProps) {
  const sc = feature.spellcasting
  const uses = ctx.self.uses ?? {}
  const attack = spellAttackBonus(sc)
  const [expanded, setExpanded] = useState<string | null>(null)  // the spell whose details are open

  // Group the spells the way stat blocks do: at will, X/day, then by slot level.
  const groups = new Map<string, MonsterSpell[]>()
  for (const s of sc.spells) {
    const label = s.usage === 'atWill' ? 'At will'
      : typeof s.usage === 'number' ? `${s.usage}/day each`
      : sc.slots ? (s.level === 0 ? 'Cantrips' : `${ordinal(s.level)} level`)
      : 'Spells'
    groups.set(label, [...(groups.get(label) ?? []), s])
  }

  return (
    <div className="action-card">
      <div className="action-title">
        <strong>{feature.name}</strong>
        <FeatureUsage feature={feature} ctx={ctx} />
      </div>
      <p className="chips">
        {sc.ability && <span className="chip-static">{sc.ability}</span>}
        {sc.dc !== undefined && <span className="chip-static">Save DC {sc.dc}</span>}
        {attack !== undefined && <span className="chip-static">{signed(attack)} to hit</span>}
      </p>

      {/* Spell slots (2014 casters): one row of pips per level */}
      {sc.slots && (
        <div className="slots">
          {Object.entries(sc.slots).map(([level, count]) => (
            <div key={level} className="slot-row">
              <span className="meta">{ordinal(Number(level))}</span>
              <UsePips
                used={uses[slotKey(Number(level))] ?? 0}
                max={count}
                label={`${ordinal(Number(level))} level slots`}
                onChange={(used) => ctx.dispatch({ type: 'setUse', id: ctx.self.id, key: slotKey(Number(level)), used })}
              />
            </div>
          ))}
        </div>
      )}

      {[...groups].map(([label, list]) => (
        <div key={label} className="spell-group">
          {/* "each" only makes sense for two or more spells */}
          <div className="spell-group-label">{list.length > 1 ? label : label.replace(' each', '')}</div>
          {list.map((ms) => (
            <SpellRow
              key={ms.index}
              ms={ms}
              spell={spells?.find((s) => s.index === ms.index)}
              sc={sc}
              featureName={feature.name}
              monster={monster}
              ctx={ctx}
              expanded={expanded === ms.index}
              onToggle={() => setExpanded(expanded === ms.index ? null : ms.index)}
            />
          ))}
        </div>
      ))}

      <details>
        <summary>Description</summary>
        <Markdown text={feature.desc} />
      </details>
    </div>
  )
}

type SpellRowProps = {
  ms: MonsterSpell
  spell?: Spell
  sc: Spellcasting
  featureName: string
  monster: Monster
  ctx: RollContext
  expanded: boolean
  onToggle: () => void
}

// One spell: name (click for details and rolls), uses left, and a Cast button.
function SpellRow({ ms, spell, sc, featureName, monster, ctx, expanded, onToggle }: SpellRowProps) {
  const uses = ctx.self.uses ?? {}
  const usesSlot = ms.level > 0 && ms.usage === undefined && !!sc.slots
  const perDayKey = spellKey(featureName, ms.index)
  const perDayUsed = uses[perDayKey] ?? 0
  const slotLevels = usesSlot ? availableSlotLevels(sc, uses, ms.level) : []
  const [slotLevel, setSlotLevel] = useState(ms.level)
  const [crit, setCrit] = useState(false)

  // The level the spell is cast at: the chosen slot (if still available), otherwise its own level.
  const castLevel = usesSlot && slotLevels.includes(slotLevel) ? slotLevel : usesSlot ? (slotLevels[0] ?? ms.level) : ms.level
  const outOfUses = (typeof ms.usage === 'number' && perDayUsed >= ms.usage) || (usesSlot && slotLevels.length === 0)

  function cast() {
    if (usesSlot) {
      ctx.dispatch({ type: 'setUse', id: ctx.self.id, key: slotKey(castLevel), used: (uses[slotKey(castLevel)] ?? 0) + 1 })
    } else if (typeof ms.usage === 'number') {
      ctx.dispatch({ type: 'setUse', id: ctx.self.id, key: perDayKey, used: perDayUsed + 1 })
    }
    if (spell?.concentration) ctx.dispatch({ type: 'concentrate', id: ctx.self.id, spell: ms.name })
    const level = usesSlot && castLevel > ms.level ? ` at ${ordinal(castLevel)} level` : ''
    ctx.log(`${ctx.self.name} casts ${ms.name}${level}${spell?.concentration ? ' (concentration)' : ''}`)
  }

  const damageDice = spell ? spellDamageDice(spell, castLevel, sc.level) : undefined
  const abilityIndex = ABILITIES.indexOf(sc.ability ?? '')
  const healDice = spell && abilityIndex >= 0 ? spellHealDice(spell, castLevel, abilityMod(monster.abilities[abilityIndex])) : undefined
  const attack = spellAttackBonus(sc)

  return (
    <div className="spell-row">
      <div className="spell-line">
        <button type="button" className="link" onClick={onToggle} aria-expanded={expanded}>
          {ms.name}
        </button>
        {(damageDice || healDice) && <span className="meta" title={healDice ? 'Healing' : 'Damage'}>{healDice ? ' ✚' : ' ⚔'}</span>}
        {spell?.concentration && <span className="tag" title="Concentration">C</span>}
        {ms.notes && <span className="meta"> ({ms.notes})</span>}
        <span className="spell-controls">
          {typeof ms.usage === 'number' && (
            <UsePips
              used={perDayUsed}
              max={ms.usage}
              label={`${ms.name} uses`}
              onChange={(used) => ctx.dispatch({ type: 'setUse', id: ctx.self.id, key: perDayKey, used })}
            />
          )}
          {/* Slot spells can be cast with a higher slot (upcasting) */}
          {usesSlot && slotLevels.length > 0 && (
            <select value={castLevel} onChange={(e) => setSlotLevel(Number(e.target.value))} aria-label={`Slot level for ${ms.name}`}>
              {slotLevels.map((l) => <option key={l} value={l}>{ordinal(l)}</option>)}
            </select>
          )}
          <button type="button" className="small" onClick={cast} disabled={outOfUses} title={outOfUses ? 'No uses or slots left' : undefined}>
            Cast
          </button>
        </span>
      </div>

      {expanded && (
        <div className="spell-details">
          {spell ? (
            <>
              <p className="meta">
                {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} · {spell.castingTime} · {spell.range} · {spell.duration}
              </p>
              {/* Rolls: spell attack, saving throw info, damage or healing */}
              {spell.attackType && attack !== undefined && <ToHit label={ms.name} bonus={attack} ctx={ctx} onRolled={setCrit} />}
              {spell.saveAbility && sc.dc !== undefined && (
                <p className="chips">
                  <span className="chip-static">DC {sc.dc} {spell.saveAbility} save{spell.saveSuccess === 'half' ? ', half on success' : ''}</span>
                </p>
              )}
              {damageDice && (
                <DamageRoller
                  key={`dmg-${castLevel}`}  // start fresh when the slot level changes the dice
                  label={ms.name}
                  parts={[{ dice: damageDice, type: spell.damageType ?? '' }]}
                  crit={crit}
                  onUsedCrit={() => setCrit(false)}
                  allowHalf={spell.saveSuccess === 'half'}
                  ctx={ctx}
                />
              )}
              {healDice && (
                <DamageRoller
                  key={`heal-${castLevel}`}
                  label={ms.name}
                  parts={[{ dice: healDice, type: '' }]}
                  crit={false}
                  onUsedCrit={() => {}}
                  heal
                  ctx={ctx}
                />
              )}
              <details>
                <summary>Spell description</summary>
                <Markdown text={spell.desc} />
                {spell.higherLevel && <Markdown text={`**At Higher Levels.** ${spell.higherLevel}`} />}
              </details>
            </>
          ) : (
            <p className="meta">Spell details not found.</p>
          )}
        </div>
      )}
    </div>
  )
}
