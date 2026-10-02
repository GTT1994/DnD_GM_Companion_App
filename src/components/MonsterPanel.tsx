// The side panel in the combat tracker for one monster: its actions with to-hit and damage
// rolls, spellcasting, limited-use tracking, and the fight's roll history.
// Monsters added by hand (not from the SRD) get a quick dice roller instead.

import { useState, type Dispatch, type ReactNode } from 'react'
import type { Ability, CombatState, Combatant } from '../types'
import { useSrd, type Feature, type Monster, type Spellcasting } from '../data/srd'
import { sortByInitiative, type CombatAction } from '../lib/combat'
import { defaultIncluded, LEGENDARY_KEY, type D20Mode } from '../lib/actions'
import { parseDice, signed } from '../lib/dice'
import { stripUsageLabel } from '../lib/homebrew'
import { ABILITIES, rollSave, saveBonus, toAbility, type GroupSavePreset } from '../lib/saves'
import { Markdown } from './Markdown'
import { DamageRoller, ToHit, type RollContext } from './RollWidgets'
import { SpellcastingCard } from './SpellcastingCard'
import { FeatureUsage, UsePips } from './UseTracking'

type MonsterPanelProps = {
  combatant: Combatant
  combat: CombatState
  dispatch: Dispatch<CombatAction>
  onClose: () => void
  onOpenStatBlock: () => void
  onGroupSave: (preset: GroupSavePreset) => void
}

export function MonsterPanel({ combatant, combat, dispatch, onClose, onOpenStatBlock, onGroupSave }: MonsterPanelProps) {
  const [mode, setMode] = useState<D20Mode>('normal')
  // Load the rules data for the edition this monster was added from.
  const edition = combatant.monster?.edition ?? '2024'
  const monsters = useSrd(edition, 'monsters')
  const spells = useSrd(edition, 'spells')
  const monster = combatant.monster ? monsters?.find((m) => m.index === combatant.monster!.index) : undefined

  const ctx: RollContext = {
    self: combatant,
    targets: sortByInitiative(combat.combatants).filter((c) => c.id !== combatant.id),
    mode,
    dispatch,
    log: (text) => dispatch({ type: 'log', entry: { id: crypto.randomUUID(), text } }),
    openGroupSave: onGroupSave,
  }

  // Spellcasting traits (2014) are shown up front; the other traits are tucked away below.
  const spellTraits = monster?.traits?.filter((t) => t.spellcasting) ?? []
  const otherTraits = monster?.traits?.filter((t) => !t.spellcasting) ?? []

  return (
    <aside className="monster-panel" aria-label={`${combatant.name} actions`}>
      <header className="panel-header">
        <div>
          <h2>{combatant.name}</h2>
          <p className="meta">
            AC {combatant.ac} · HP {combatant.hp}/{combatant.maxHp}
            {monster && <> · <button type="button" className="link" onClick={onOpenStatBlock}>Full stat block</button></>}
          </p>
        </div>
        <button type="button" className="remove" onClick={onClose} aria-label="Close panel">✕</button>
      </header>

      {/* Advantage / disadvantage for every to-hit roll and save in the panel */}
      <div className="mode-switch" role="group" aria-label="Roll mode">
        {(['disadvantage', 'normal', 'advantage'] as const).map((m) => (
          <button key={m} type="button" className={mode === m ? 'selected' : ''} onClick={() => setMode(m)}>
            {m === 'normal' ? 'Normal' : m === 'advantage' ? 'Advantage' : 'Disadvantage'}
          </button>
        ))}
      </div>

      {!combatant.monster && <QuickRoller ctx={ctx} />}
      {combatant.monster && !monster && !monsters && <p className="meta">Loading…</p>}
      {/* e.g. a homebrew monster deleted after being added to the fight */}
      {combatant.monster && !monster && monsters && (
        <>
          <p className="meta">This monster isn't in the {edition} rules or your homebrew any more, so here's a quick roller instead.</p>
          <QuickRoller ctx={ctx} />
        </>
      )}

      {monster && (
        <>
          <SavingThrows monster={monster} ctx={ctx} />
          <FeatureSection title="Spellcasting" features={spellTraits} render={(f) => <SpellcastingCard feature={f as SpellFeature} monster={monster} spells={spells} ctx={ctx} />} />
          <FeatureSection title="Actions" features={monster.actions} render={(f) => renderFeature(f)} />
          <FeatureSection title="Bonus Actions" features={monster.bonusActions} render={(f) => renderFeature(f)} />
          <FeatureSection title="Reactions" features={monster.reactions} render={(f) => renderFeature(f)} />
          {monster.legendaryActions?.length ? <LegendarySection features={monster.legendaryActions} ctx={ctx} /> : null}
          {otherTraits.length > 0 && (
            <details className="traits">
              <summary>Traits ({otherTraits.length})</summary>
              {otherTraits.map((f) => <ActionCard key={f.name} feature={f} ctx={ctx} />)}
            </details>
          )}
        </>
      )}

      <RollLog combat={combat} />
    </aside>
  )

  // Spellcasting actions (2024) get the spell card; everything else an action card.
  function renderFeature(f: Feature) {
    return f.spellcasting
      ? <SpellcastingCard feature={f as SpellFeature} monster={monster!} spells={spells} ctx={ctx} />
      : <ActionCard feature={f} ctx={ctx} />
  }
}

type SpellFeature = Feature & { spellcasting: Spellcasting }

// A titled list of traits or actions, skipped if empty.
function FeatureSection({ title, features, render }: { title: string; features?: Feature[]; render: (f: Feature) => ReactNode }) {
  if (!features?.length) return null
  return (
    <section className="panel-section">
      <h3>{title}</h3>
      {features.map((f) => <div key={f.name}>{render(f)}</div>)}
    </section>
  )
}

type ActionCardProps = {
  feature: Feature
  ctx: RollContext
  legendary?: { cost: number; left: number; onUse: () => void }  // set for legendary actions
}

// One trait or action: its limits, to-hit and damage rolls, and description.
function ActionCard({ feature, ctx, legendary }: ActionCardProps) {
  const [crit, setCrit] = useState(false)  // the last to-hit roll was a natural 20
  const hasRolls = feature.attack !== undefined || !!feature.damage?.length

  return (
    <div className="action-card">
      <div className="action-title">
        <strong>{feature.name}</strong>
        <FeatureUsage feature={feature} ctx={ctx} />
        {legendary && (
          <button type="button" className="small" disabled={legendary.left < legendary.cost} onClick={legendary.onUse}>
            Use{legendary.cost > 1 ? ` (${legendary.cost})` : ''}
          </button>
        )}
      </div>

      {feature.dc && (
        <p className="chips">
          <span className="chip-static">
            DC {feature.dc.value} {feature.dc.ability}{feature.attack === undefined ? ' save' : ''}
            {feature.dc.success === 'half' && feature.attack === undefined ? ', half on success' : ''}
          </span>
          {/* Save effects that hit several creatures, e.g. a breath weapon */}
          {feature.attack === undefined && toAbility(feature.dc.ability) && (
            <button
              type="button"
              className="small"
              onClick={() => ctx.openGroupSave({
                label: `${ctx.self.name} · ${stripUsageLabel(feature.name)}`,
                sourceId: ctx.self.id,
                ability: toAbility(feature.dc!.ability),
                dc: feature.dc!.value,
                damage: feature.damage?.[0]?.dice,
                damageType: feature.damage?.[0]?.type,
                onSuccess: feature.dc!.success === 'half' ? 'half' : 'none',
              })}
            >
              Group save
            </button>
          )}
        </p>
      )}
      {feature.attack !== undefined && <ToHit label={feature.name} bonus={feature.attack} ctx={ctx} onRolled={setCrit} />}
      {feature.damage?.length ? (
        <DamageRoller
          label={feature.name}
          parts={feature.damage}
          initialIncluded={defaultIncluded(feature.desc, feature.damage)}
          crit={crit}
          onUsedCrit={() => setCrit(false)}
          allowHalf={feature.dc?.success === 'half'}
          ctx={ctx}
        />
      ) : null}

      {/* Actions with buttons keep their full text folded away; text-only ones show it */}
      {hasRolls ? (
        <details>
          <summary>Description</summary>
          <Markdown text={feature.desc} />
        </details>
      ) : (
        <Markdown text={feature.desc} />
      )}
    </div>
  )
}

// Legendary actions, with a counter of uses left this round (reset at the start of the monster's turn).
function LegendarySection({ features, ctx }: { features: Feature[]; ctx: RollContext }) {
  const max = ctx.self.legendaryMax ?? 3
  const used = Math.min(ctx.self.uses?.[LEGENDARY_KEY] ?? 0, max)
  const setUsed = (value: number) => ctx.dispatch({ type: 'setUse', id: ctx.self.id, key: LEGENDARY_KEY, used: value })

  return (
    <section className="panel-section">
      <h3>Legendary Actions</h3>
      <div className="legendary-counter">
        <UsePips used={used} max={max} onChange={setUsed} label="Legendary actions" />
        <span className="meta">{max - used} of {max} left this round</span>
        {/* The data doesn't say how many each monster gets; 3 is the usual number */}
        <button type="button" className="small" onClick={() => ctx.dispatch({ type: 'setLegendaryMax', id: ctx.self.id, max: max - 1 })} disabled={max <= 1} aria-label="Fewer legendary actions">−</button>
        <button type="button" className="small" onClick={() => ctx.dispatch({ type: 'setLegendaryMax', id: ctx.self.id, max: max + 1 })} aria-label="More legendary actions">+</button>
      </div>
      {features.map((f) => {
        // e.g. "Wing Attack (Costs 2 Actions)"
        const cost = parseInt(`${f.name} ${f.desc}`.match(/costs (\d+) actions/i)?.[1] ?? '1')
        return (
          <ActionCard
            key={f.name}
            feature={f}
            ctx={ctx}
            legendary={{
              cost,
              left: max - used,
              onUse: () => {
                setUsed(used + cost)
                ctx.log(`${ctx.self.name} uses legendary action: ${f.name}`)
              },
            }}
          />
        )
      })}
    </section>
  )
}

// Six saving throw buttons, using the stat block's proficiencies and the panel's roll mode.
function SavingThrows({ monster, ctx }: { monster: Monster; ctx: RollContext }) {
  const [last, setLast] = useState<{ ability: Ability; total: number; detail: string } | null>(null)

  function roll(ability: Ability) {
    const bonus = saveBonus(monster, ability)
    const r = rollSave(bonus, 0, ctx.mode)
    const detail = `${r.rolls.length > 1 ? `${r.rolls.join(' & ')} → ` : ''}${r.natural} ${signed(bonus)}`
    setLast({ ability, total: r.total, detail })
    ctx.log(`${ctx.self.name} · ${ability} save: ${r.total} (${detail}${ctx.mode !== 'normal' ? `, ${ctx.mode}` : ''})`)
  }

  return (
    <section className="panel-section saving-throws">
      <h3>Saving throws</h3>
      <div className="save-buttons">
        {ABILITIES.map((a) => (
          <button key={a} type="button" className="small" onClick={() => roll(a)}>{a} {signed(saveBonus(monster, a))}</button>
        ))}
      </div>
      {last && (
        <p className="roll-result save-result">
          {last.ability} save <strong>{last.total}</strong> <span className="meta">({last.detail})</span>
        </p>
      )}
    </section>
  )
}

// For monsters added by hand: type a to-hit bonus and damage dice, and roll them.
function QuickRoller({ ctx }: { ctx: RollContext }) {
  const [bonus, setBonus] = useState('')
  const [dice, setDice] = useState('')
  const [crit, setCrit] = useState(false)
  const bonusValue = parseInt(bonus)
  const validDice = dice.trim() !== '' && parseDice(dice) !== null

  return (
    <section className="panel-section">
      <h3>Quick roll</h3>
      <p className="meta">This creature isn't from the rules data, so type its numbers in.</p>
      <div className="quick-roller">
        <label>
          To hit
          <input value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="+5" />
        </label>
        <label>
          Damage
          <input value={dice} onChange={(e) => setDice(e.target.value)} placeholder="2d6+3" />
        </label>
      </div>
      {!Number.isNaN(bonusValue) && <ToHit label="Attack" bonus={bonusValue} ctx={ctx} onRolled={setCrit} />}
      {dice.trim() !== '' && !validDice && <p className="error">Write dice like 2d6+3, d8 or 5.</p>}
      {validDice && (
        <DamageRoller key={dice} label="Attack" parts={[{ dice, type: '' }]} crit={crit} onUsedCrit={() => setCrit(false)} ctx={ctx} />
      )}
    </section>
  )
}

// The fight's recent rolls, newest first.
function RollLog({ combat }: { combat: CombatState }) {
  if (!combat.log?.length) return null
  return (
    <section className="panel-section">
      <h3>Recent rolls</h3>
      <ol className="roll-log">
        {combat.log.map((entry) => <li key={entry.id}>{entry.text}</li>)}
      </ol>
    </section>
  )
}
