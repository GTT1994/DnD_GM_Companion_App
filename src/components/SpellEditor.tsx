// The homebrew spell editor: a form on the left and a live preview on the right.
// Damage and healing are entered as base dice plus extra dice per slot level above the spell's level.

import { useState } from 'react'
import type { HomebrewEdition, HomebrewSpell } from '../db'
import { ABILITY_NAMES, DAMAGE_TYPES, homebrewToSpell, spellProblems } from '../lib/homebrew'
import { DiceField } from './FormFields'
import { SpellDetail } from './SpellDetail'

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']

// 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th"…
const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`

type SpellEditorProps = {
  initial: HomebrewSpell
  onSave: (spell: HomebrewSpell) => void
  onCancel: () => void
  onDelete?: () => void
}

export function SpellEditor({ initial, onSave, onCancel, onDelete }: SpellEditorProps) {
  const [draft, setDraft] = useState(initial)
  const set = <K extends keyof HomebrewSpell>(key: K, value: HomebrewSpell[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const problems = spellProblems(draft)
  const preview = homebrewToSpell(draft)
  const isCantrip = draft.level === 0

  return (
    <div className="editor-layout">
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (problems.length === 0) onSave(draft)
        }}
      >
        <fieldset>
          <legend>Basics</legend>
          <div className="field-grid">
            <label className="wide">
              Name
              <input required value={draft.name} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label>
              Edition
              <select value={draft.edition} onChange={(e) => set('edition', e.target.value as HomebrewEdition)}>
                <option value="both">Both</option>
                <option value="2014">2014</option>
                <option value="2024">2024</option>
              </select>
            </label>
            <label>
              Level
              <select value={draft.level} onChange={(e) => set('level', Number(e.target.value))}>
                <option value={0}>Cantrip</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => <option key={l} value={l}>{ordinal(l)}</option>)}
              </select>
            </label>
            <label>
              School
              <select value={draft.school} onChange={(e) => set('school', e.target.value)}>
                {[...new Set([draft.school, ...SCHOOLS])].map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>
              Casting time
              <input value={draft.castingTime} onChange={(e) => set('castingTime', e.target.value)} />
            </label>
            <label>
              Range
              <input value={draft.range} onChange={(e) => set('range', e.target.value)} />
            </label>
            <label>
              Components
              <input value={draft.components} onChange={(e) => set('components', e.target.value)} placeholder="V, S, M (a pinch of sulfur)" />
            </label>
            <label>
              Duration
              <input value={draft.duration} onChange={(e) => set('duration', e.target.value)} />
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={draft.concentration} onChange={(e) => set('concentration', e.target.checked)} />
              Concentration
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={draft.ritual} onChange={(e) => set('ritual', e.target.checked)} />
              Ritual
            </label>
            <label className="wide">
              Classes
              <input
                value={draft.classes.join(', ')}
                onChange={(e) => set('classes', e.target.value.split(',').map((c) => c.trim()).filter(Boolean))}
                placeholder="Wizard, Sorcerer"
              />
            </label>
          </div>
          <label className="block">
            Description
            <textarea rows={6} value={draft.desc} onChange={(e) => set('desc', e.target.value)} />
          </label>
          <label className="block">
            At higher levels
            <textarea rows={2} value={draft.higherLevel ?? ''} onChange={(e) => set('higherLevel', e.target.value || undefined)} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Rolls in combat</legend>
          <div className="field-grid">
            <label>
              Spell attack
              <select value={draft.attackType ?? ''} onChange={(e) => set('attackType', (e.target.value || undefined) as HomebrewSpell['attackType'])}>
                <option value="">None</option>
                <option value="melee">Melee</option>
                <option value="ranged">Ranged</option>
              </select>
            </label>
            <label>
              Saving throw
              <select value={draft.saveAbility ?? ''} onChange={(e) => set('saveAbility', e.target.value || undefined)}>
                <option value="">None</option>
                {ABILITY_NAMES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
            {draft.saveAbility && (
              <label>
                On a success
                <select value={draft.saveSuccess ?? 'half'} onChange={(e) => set('saveSuccess', e.target.value)}>
                  <option value="half">Half damage</option>
                  <option value="none">No effect</option>
                </select>
              </label>
            )}
          </div>
          <div className="field-grid">
            <DiceField label={isCantrip ? 'Damage' : `Damage at ${ordinal(draft.level)} level`} value={draft.damageDice} onChange={(v) => set('damageDice', v || undefined)} placeholder="8d6" />
            <label>
              Damage type
              <select value={draft.damageType ?? ''} onChange={(e) => set('damageType', e.target.value || undefined)}>
                <option value="">—</option>
                {DAMAGE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            {!isCantrip && <DiceField label="Extra per level above" value={draft.damagePerLevel} onChange={(v) => set('damagePerLevel', v || undefined)} placeholder="1d6" />}
          </div>
          <div className="field-grid">
            <DiceField label="Healing" value={draft.healDice} onChange={(v) => set('healDice', v || undefined)} placeholder="1d8 + MOD" allowMod />
            {!isCantrip && <DiceField label="Extra healing per level" value={draft.healPerLevel} onChange={(v) => set('healPerLevel', v || undefined)} placeholder="1d8" />}
          </div>
          <p className="meta">
            {isCantrip
              ? 'Cantrip damage doubles at caster level 5, triples at 11 and quadruples at 17.'
              : 'Healing can end in "+ MOD" for the caster\'s spellcasting ability modifier.'}
          </p>
        </fieldset>

        {problems.length > 0 && (
          <ul className="problems">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
        <div className="editor-buttons">
          <button type="submit" className="primary" disabled={problems.length > 0}>Save spell</button>
          <button type="button" onClick={onCancel}>Cancel</button>
          {onDelete && <button type="button" className="danger" onClick={onDelete}>Delete</button>}
        </div>
      </form>

      <div className="editor-preview">
        <SpellDetail spell={preview} />
        <ScalingPreview table={preview.damageByLevel ?? preview.damageBySlot} label={`Damage${preview.damageType ? ` (${preview.damageType})` : ''}`} cantrip={isCantrip} />
        <ScalingPreview table={preview.healBySlot} label="Healing" cantrip={isCantrip} />
      </div>
    </div>
  )
}

// Shows the dice at each level, e.g. "3rd 8d6 · 4th 9d6 · 5th 10d6".
function ScalingPreview({ table, label, cantrip }: { table?: Record<string, string>; label: string; cantrip: boolean }) {
  if (!table) return null
  return (
    <div className="scaling-preview">
      <strong>{label}</strong>
      <p className="meta">
        {Object.entries(table).map(([level, dice]) => `${cantrip ? `Caster level ${level}+` : ordinal(Number(level))} ${dice}`).join(' · ')}
      </p>
    </div>
  )
}
