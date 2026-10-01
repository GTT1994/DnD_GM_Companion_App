// Shows a monster's full stat block, with a button to add it to the combat tracker.
// Also used (without the button) as the preview in the homebrew monster editor.

import { useState, type ReactNode } from 'react'
import type { Feature, Monster } from '../data/srd'
import { abilityMod, formatCr, signed } from '../lib/dice'
import { Markdown } from './Markdown'

const ABILITY_NAMES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

type StatBlockProps = {
  monster: Monster
  onAdd?: (count: number) => Promise<unknown>  // adds this many of the monster to the combat tracker
  extra?: ReactNode                             // more buttons, e.g. "Make homebrew copy"
}

export function StatBlock({ monster: m, onAdd, extra }: StatBlockProps) {
  const [count, setCount] = useState('1')
  // A short "Added 3 × Goblin" message shown after adding.
  const [added, setAdded] = useState('')

  async function add() {
    const n = Math.max(1, Math.min(20, parseInt(count) || 1))  // between 1 and 20
    setAdded('Adding…')
    await onAdd?.(n)  // wait until it's saved before saying it's done
    setAdded(`Added ${n} × ${m.name} to combat`)
  }

  return (
    <article className="stat-block">
      <header className="detail-header">
        <div>
          <h2>{m.name || 'Unnamed monster'}</h2>
          <p className="meta">
            {m.meta}
            {m.homebrew && <span className="tag homebrew-tag">Homebrew</span>}
          </p>
        </div>
        <div className="detail-actions">
          {extra}
          {onAdd && (
            <form
              className="add-monster"
              onSubmit={(e) => {
                e.preventDefault()
                add()
              }}
            >
              <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(e.target.value)} aria-label="How many to add" />
              <button type="submit" className="primary">Add to combat</button>
            </form>
          )}
        </div>
      </header>
      {added && <p className="notice">{added}</p>}

      <div className="rule" />
      <Line label="Armor Class" value={m.acNote ? `${m.ac} (${m.acNote})` : `${m.ac}`} />
      <Line label="Hit Points" value={`${m.hp} (${m.hitDice})`} />
      <Line label="Speed" value={m.speed} />
      <div className="rule" />

      {/* Ability scores with their modifiers, e.g. "14 (+2)" */}
      <div className="abilities">
        {m.abilities.map((score, i) => (
          <div key={ABILITY_NAMES[i]}>
            <div className="ability-name">{ABILITY_NAMES[i]}</div>
            <div>{score} ({signed(abilityMod(score))})</div>
          </div>
        ))}
      </div>
      <div className="rule" />

      <Line label="Saving Throws" value={m.saves} />
      <Line label="Skills" value={m.skills} />
      <Line label="Damage Vulnerabilities" value={m.vulnerabilities} />
      <Line label="Damage Resistances" value={m.resistances} />
      <Line label="Damage Immunities" value={m.immunities} />
      <Line label="Condition Immunities" value={m.conditionImmunities} />
      <Line label="Senses" value={m.senses} />
      <Line label="Languages" value={m.languages ?? '—'} />
      <Line label="Challenge" value={`${formatCr(m.cr)} (${m.xp.toLocaleString()} XP)`} />
      <div className="rule" />

      <Features list={m.traits} />
      <Features title="Actions" list={m.actions} />
      <Features title="Bonus Actions" list={m.bonusActions} />
      <Features title="Reactions" list={m.reactions} />
      <Features title="Legendary Actions" list={m.legendaryActions} />
    </article>
  )
}

// One "Label value" line, skipped if there's no value.
function Line({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return <p className="line"><strong>{label}</strong> {value}</p>
}

// A titled list of traits or actions, skipped if empty.
function Features({ title, list }: { title?: string; list?: Feature[] }) {
  if (!list?.length) return null
  return (
    <section className="features">
      {title && <h3>{title}</h3>}
      {list.map((f) => (
        // Shown as Markdown so line breaks and spell lists display properly; ***text*** is bold italic.
        <Markdown key={f.name} text={`***${f.name}.*** ${f.desc}`} />
      ))}
    </section>
  )
}
