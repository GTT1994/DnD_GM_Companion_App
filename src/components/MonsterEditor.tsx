// The homebrew monster editor: a form on the left and a live stat block preview on the right.
// Every trait and action can have an attack bonus, damage dice, a saving throw DC, limited uses
// and spellcasting, so the monster works with the combat tracker's rolls like an SRD monster.

import { useState } from 'react'
import type { HomebrewEdition, HomebrewMonster } from '../db'
import { useSrd, type DamagePart, type Feature, type MonsterSpell, type Spell, type Spellcasting } from '../data/srd'
import type { Edition } from '../types'
import {
  ABILITY_NAMES, CHALLENGE_RATINGS, DAMAGE_TYPES, FEATURE_SECTIONS, XP_BY_CR, monsterProblems, spellListMarkdown,
  stripUsageLabel, usageLabel, withSpellList,
} from '../lib/homebrew'
import { abilityMod, formatCr, signed } from '../lib/dice'
import { DiceField, NumberField } from './FormFields'
import { StatBlock } from './StatBlock'
import { ENVIRONMENT_LABELS, ENVIRONMENTS } from '../data/environments'

const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']

type MonsterEditorProps = {
  initial: HomebrewMonster
  appEdition: Edition              // used to pick spells when the monster is tagged "Both"
  onSave: (monster: HomebrewMonster) => void
  onCancel: () => void
  onDelete?: () => void
}

export function MonsterEditor({ initial, appEdition, onSave, onCancel, onDelete }: MonsterEditorProps) {
  const [draft, setDraft] = useState(initial)
  // Size, type and alignment are stored together as "Medium, humanoid, neutral".
  const parts = initial.meta.split(', ')
  const [size, setSize] = useState(parts[0] ?? 'Medium')
  const [type, setType] = useState(parts.slice(1, -1).join(', ') || 'humanoid')
  const [alignment, setAlignment] = useState(parts.length > 1 ? parts[parts.length - 1] : 'neutral')
  // Spells to choose from: the tagged edition, or the app's current one for "Both".
  const spells = useSrd(draft.edition === 'both' ? appEdition : draft.edition, 'spells')

  // Changes one field of the draft.
  const set = <K extends keyof HomebrewMonster>(key: K, value: HomebrewMonster[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const setMeta = (s: string, t: string, a: string) => set('meta', [s, t, a].filter(Boolean).join(', '))
  const problems = monsterProblems(draft)

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
              Size
              <select value={size} onChange={(e) => { setSize(e.target.value); setMeta(e.target.value, type, alignment) }}>
                {SIZES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>
              Type
              <input value={type} onChange={(e) => { setType(e.target.value); setMeta(size, e.target.value, alignment) }} placeholder="humanoid (goblinoid)" />
            </label>
            <label>
              Alignment
              <input value={alignment} onChange={(e) => { setAlignment(e.target.value); setMeta(size, type, e.target.value) }} />
            </label>
            <NumberField label="AC" value={draft.ac} min={0} max={40} onChange={(v) => set('ac', v ?? 0)} />
            <label>
              AC note
              <input value={draft.acNote ?? ''} onChange={(e) => set('acNote', e.target.value || undefined)} placeholder="natural armor" />
            </label>
            <NumberField label="Hit points" value={draft.hp} min={1} onChange={(v) => set('hp', v ?? 1)} />
            <DiceField label="Hit dice" value={draft.hitDice} onChange={(v) => set('hitDice', v)} placeholder="4d8+4" />
            <label className="wide">
              Speed
              <input value={draft.speed} onChange={(e) => set('speed', e.target.value)} placeholder="30 ft., fly 60 ft." />
            </label>
            <label>
              Challenge
              {/* XP is set from the challenge rating */}
              <select value={draft.cr} onChange={(e) => setDraft((d) => ({ ...d, cr: Number(e.target.value), xp: XP_BY_CR[e.target.value] }))}>
                {CHALLENGE_RATINGS.map((cr) => <option key={cr} value={cr}>{formatCr(cr)} ({XP_BY_CR[cr].toLocaleString()} XP)</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Ability scores</legend>
          <div className="ability-grid">
            {ABILITY_NAMES.map((name, i) => (
              <NumberField
                key={name}
                label={`${name} (${signed(abilityMod(draft.abilities[i]))})`}
                value={draft.abilities[i]}
                min={1}
                max={30}
                onChange={(v) => set('abilities', draft.abilities.map((s, j) => (j === i ? v ?? 10 : s)))}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Details</legend>
          <div className="field-grid">
            {([
              ['saves', 'Saving throws', 'Dex +4, Wis +2'],
              ['skills', 'Skills', 'Perception +4, Stealth +6'],
              ['vulnerabilities', 'Damage vulnerabilities', ''],
              ['resistances', 'Damage resistances', ''],
              ['immunities', 'Damage immunities', ''],
              ['conditionImmunities', 'Condition immunities', ''],
              ['senses', 'Senses', 'darkvision 60 ft., passive Perception 12'],
              ['languages', 'Languages', 'Common, Goblin'],
            ] as const).map(([key, label, placeholder]) => (
              <label key={key} className="wide">
                {label}
                <input value={draft[key] ?? ''} placeholder={placeholder} onChange={(e) => set(key, e.target.value || (key === 'senses' ? '' : undefined))} />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Environments</legend>
          <p className="meta">Where it lives, so the random encounter generator can pick it.</p>
          <div className="environment-boxes">
            {ENVIRONMENTS.map((env) => (
              <label key={env} className="checkbox">
                <input
                  type="checkbox"
                  checked={draft.environments?.includes(env) ?? false}
                  onChange={(e) => {
                    const list = (draft.environments ?? []).filter((x) => x !== env)
                    set('environments', e.target.checked ? [...list, env] : list.length ? list : undefined)
                  }}
                />
                {ENVIRONMENT_LABELS[env]}
              </label>
            ))}
          </div>
        </fieldset>

        {FEATURE_SECTIONS.map(({ key, label }) => (
          <FeatureListEditor
            key={key}
            title={label}
            features={draft[key] ?? []}
            onChange={(list) => set(key, list.length ? list : undefined)}
            spells={spells}
          />
        ))}

        {problems.length > 0 && (
          <ul className="problems">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
        <div className="editor-buttons">
          <button type="submit" className="primary" disabled={problems.length > 0}>Save monster</button>
          <button type="button" onClick={onCancel}>Cancel</button>
          {onDelete && <button type="button" className="danger" onClick={onDelete}>Delete</button>}
        </div>
      </form>

      {/* Live preview, exactly as it'll appear in Quick Lookup */}
      <div className="editor-preview">
        <StatBlock monster={{ ...draft, homebrew: true }} />
      </div>
    </div>
  )
}

type FeatureListEditorProps = {
  title: string
  features: Feature[]
  onChange: (features: Feature[]) => void
  spells: Spell[] | null
}

// A section of traits or actions: add, edit, reorder and remove entries.
function FeatureListEditor({ title, features, onChange, spells }: FeatureListEditorProps) {
  // A stable id per entry (kept in step with the list), so boxes keep their text when entries move or are removed.
  const [ids, setIds] = useState(() => features.map(() => crypto.randomUUID()))
  const update = (i: number, f: Feature) => onChange(features.map((x, j) => (j === i ? f : x)))
  const move = (i: number, by: number) => {
    const reorder = <T,>(list: T[]) => {
      const copy = [...list]
      const [item] = copy.splice(i, 1)
      copy.splice(i + by, 0, item)
      return copy
    }
    setIds(reorder(ids))
    onChange(reorder(features))
  }
  const remove = (i: number) => {
    setIds(ids.filter((_, j) => j !== i))
    onChange(features.filter((_, j) => j !== i))
  }
  const add = () => {
    setIds([...ids, crypto.randomUUID()])
    onChange([...features, { name: '', desc: '' }])
  }

  return (
    <fieldset>
      <legend>{title}</legend>
      {features.map((f, i) => (
        <FeatureEditor
          key={ids[i]}
          feature={f}
          spells={spells}
          onChange={(nf) => update(i, nf)}
          onRemove={() => remove(i)}
          onMoveUp={i > 0 ? () => move(i, -1) : undefined}
          onMoveDown={i < features.length - 1 ? () => move(i, 1) : undefined}
        />
      ))}
      <button type="button" className="small" onClick={add}>
        + Add {title.toLowerCase().replace(/s$/, '')}
      </button>
    </fieldset>
  )
}

type FeatureEditorProps = {
  feature: Feature
  spells: Spell[] | null
  onChange: (feature: Feature) => void
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

// One trait or action. Its stored name includes the usage, e.g. "Fire Breath (Recharge 5–6)".
function FeatureEditor({ feature: f, spells, onChange, onRemove, onMoveUp, onMoveDown }: FeatureEditorProps) {
  const plainName = stripUsageLabel(f.name)
  const withName = (name: string, usage: Feature['usage']) => (usage ? `${name} (${usageLabel(usage)})` : name)
  const set = (changes: Partial<Feature>) => onChange({ ...f, ...changes })
  const setUsage = (usage: Feature['usage']) => set({ usage, name: withName(plainName, usage) })
  const damage = f.damage ?? []
  const setDamage = (parts: DamagePart[]) => set({ damage: parts.length ? parts : undefined })

  return (
    <div className="feature-editor">
      <div className="field-grid">
        <label className="wide">
          Name
          <input value={plainName} onChange={(e) => set({ name: withName(e.target.value, f.usage) })} placeholder="Scimitar" />
        </label>
        <label>
          Uses
          <select
            value={f.usage?.type ?? ''}
            onChange={(e) => {
              const type = e.target.value
              setUsage(type === 'recharge' ? { type, min: 5 } : type === 'perDay' ? { type, times: 1 } : type === 'rest' ? { type } : undefined)
            }}
          >
            <option value="">Unlimited</option>
            <option value="recharge">Recharge</option>
            <option value="perDay">X per day</option>
            <option value="rest">Once per rest</option>
          </select>
        </label>
        {f.usage?.type === 'recharge' && (
          <label>
            Recharges on
            <select value={f.usage.min} onChange={(e) => setUsage({ type: 'recharge', min: Number(e.target.value) })}>
              <option value={6}>6</option>
              <option value={5}>5–6</option>
              <option value={4}>4–6</option>
            </select>
          </label>
        )}
        {f.usage?.type === 'perDay' && (
          <NumberField label="Times per day" value={f.usage.times} min={1} max={9} onChange={(v) => setUsage({ type: 'perDay', times: v ?? 1 })} />
        )}
      </div>

      <label className="block">
        Description
        <textarea rows={3} value={f.desc} onChange={(e) => set({ desc: e.target.value })} placeholder="Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Slashing damage." />
      </label>

      <div className="field-grid">
        <NumberField label="Attack bonus" value={f.attack} optional min={-5} max={30} onChange={(v) => set({ attack: v })} />
        <label className="checkbox">
          <input
            type="checkbox"
            checked={!!f.dc}
            onChange={(e) => set({ dc: e.target.checked ? { ability: 'DEX', value: 13, success: 'half' } : undefined })}
          />
          Saving throw
        </label>
        {f.dc && (
          <>
            <label>
              Ability
              <select value={f.dc.ability} onChange={(e) => set({ dc: { ...f.dc!, ability: e.target.value } })}>
                {ABILITY_NAMES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
            <NumberField label="DC" value={f.dc.value} min={1} max={30} onChange={(v) => set({ dc: { ...f.dc!, value: v ?? 10 } })} />
            <label>
              On a success
              <select value={f.dc.success} onChange={(e) => set({ dc: { ...f.dc!, success: e.target.value } })}>
                <option value="half">Half damage</option>
                <option value="none">No effect</option>
              </select>
            </label>
          </>
        )}
      </div>

      {/* Damage parts, e.g. 1d6+2 Slashing plus 1d4 Fire */}
      {damage.map((part, i) => (
        <div key={i} className="field-grid damage-part">
          <DiceField label={i === 0 ? 'Damage' : 'Extra damage'} value={part.dice} onChange={(dice) => setDamage(damage.map((p, j) => (j === i ? { ...p, dice } : p)))} placeholder="1d6+2" />
          <label>
            Type
            <select value={part.type} onChange={(e) => setDamage(damage.map((p, j) => (j === i ? { ...p, type: e.target.value } : p)))}>
              {[...new Set([part.type, ...DAMAGE_TYPES])].filter(Boolean).map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label>
            Note
            <input value={part.note ?? ''} onChange={(e) => setDamage(damage.map((p, j) => (j === i ? { ...p, note: e.target.value || undefined } : p)))} placeholder="optional, e.g. two-handed" />
          </label>
          <button type="button" className="small remove" onClick={() => setDamage(damage.filter((_, j) => j !== i))} aria-label="Remove damage">✕</button>
        </div>
      ))}
      <div className="feature-buttons">
        <button type="button" className="small" onClick={() => setDamage([...damage, { dice: '', type: 'Slashing' }])}>+ Damage</button>
        <label className="checkbox small">
          <input
            type="checkbox"
            checked={!!f.spellcasting}
            onChange={(e) => set({ spellcasting: e.target.checked ? { ability: 'INT', dc: 13, spells: [] } : undefined })}
          />
          Spellcasting
        </label>
        <span className="spacer" />
        {onMoveUp && <button type="button" className="small" onClick={onMoveUp} aria-label="Move up">↑</button>}
        {onMoveDown && <button type="button" className="small" onClick={onMoveDown} aria-label="Move down">↓</button>}
        <button type="button" className="small danger" onClick={onRemove}>Remove</button>
      </div>

      {f.spellcasting && (
        <SpellcastingEditor
          sc={f.spellcasting}
          spells={spells}
          onChange={(spellcasting) => set({ spellcasting })}
          onWriteList={() => set({ desc: withSpellList(f.desc, spellListMarkdown(f.spellcasting!.spells, f.spellcasting!.slots)) })}
        />
      )}
    </div>
  )
}

type SpellcastingEditorProps = {
  sc: Spellcasting
  spells: Spell[] | null
  onChange: (sc: Spellcasting) => void
  onWriteList: () => void
}

// Spellcasting details and the list of spells the monster can cast.
function SpellcastingEditor({ sc, spells, onChange, onWriteList }: SpellcastingEditorProps) {
  const [search, setSearch] = useState('')
  const set = (changes: Partial<Spellcasting>) => onChange({ ...sc, ...changes })
  const setSpell = (i: number, changes: Partial<MonsterSpell>) => set({ spells: sc.spells.map((s, j) => (j === i ? { ...s, ...changes } : s)) })

  // Adds the spell whose name matches the search box.
  function addSpell() {
    const spell = spells?.find((s) => s.name.toLowerCase() === search.trim().toLowerCase())
    if (!spell || sc.spells.some((s) => s.index === spell.index)) return
    set({ spells: [...sc.spells, { index: spell.index, name: spell.name, level: spell.level, usage: sc.slots && spell.level > 0 ? undefined : 'atWill' }] })
    setSearch('')
  }

  return (
    <div className="spellcasting-editor">
      <div className="field-grid">
        <label>
          Ability
          <select value={sc.ability ?? 'INT'} onChange={(e) => set({ ability: e.target.value })}>
            {ABILITY_NAMES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <NumberField label="Save DC" value={sc.dc} optional min={1} max={30} onChange={(v) => set({ dc: v })} />
        <NumberField label="Spell attack" value={sc.attack} optional min={-5} max={20} onChange={(v) => set({ attack: v })} />
        <NumberField label="Caster level" value={sc.level} optional min={1} max={20} onChange={(v) => set({ level: v })} />
        <label className="checkbox">
          <input type="checkbox" checked={!!sc.slots} onChange={(e) => set({ slots: e.target.checked ? { 1: 2 } : undefined })} />
          Spell slots
        </label>
      </div>
      <p className="meta">Leave Spell attack empty to use DC − 8. Caster level makes cantrips scale.</p>

      {sc.slots && (
        <div className="slot-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
            <NumberField
              key={level}
              label={`Level ${level}`}
              value={sc.slots?.[level]}
              optional
              min={0}
              max={9}
              onChange={(v) => {
                const slots = { ...sc.slots }
                if (v) slots[level] = v
                else delete slots[level]
                set({ slots })
              }}
            />
          ))}
        </div>
      )}

      {sc.spells.map((s, i) => (
        <div key={s.index} className="field-grid spell-entry">
          <span className="spell-entry-name">{s.name} <span className="meta">{s.level === 0 ? 'cantrip' : `level ${s.level}`}</span></span>
          <label>
            Can cast
            <select
              value={s.usage === undefined ? 'slot' : String(s.usage)}
              onChange={(e) => setSpell(i, { usage: e.target.value === 'atWill' ? 'atWill' : e.target.value === 'slot' ? undefined : Number(e.target.value) })}
            >
              <option value="atWill">At will</option>
              <option value="1">1/day</option>
              <option value="2">2/day</option>
              <option value="3">3/day</option>
              <option value="slot">{sc.slots ? 'Uses a slot' : 'Limited by trait'}</option>
            </select>
          </label>
          <label>
            Note
            <input value={s.notes ?? ''} onChange={(e) => setSpell(i, { notes: e.target.value || undefined })} placeholder="self only" />
          </label>
          <button type="button" className="small remove" onClick={() => set({ spells: sc.spells.filter((_, j) => j !== i) })} aria-label={`Remove ${s.name}`}>✕</button>
        </div>
      ))}

      <div className="feature-buttons">
        {/* Type a spell name; the list suggests SRD and homebrew spells */}
        <input
          list="spell-names"
          value={search}
          placeholder="Add a spell…"
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addSpell()
            }
          }}
        />
        <datalist id="spell-names">
          {spells?.map((s) => <option key={s.index} value={s.name} />)}
        </datalist>
        <button type="button" className="small" onClick={addSpell}>Add spell</button>
        <span className="spacer" />
        <button type="button" className="small" onClick={onWriteList} disabled={sc.spells.length === 0}>Write spell list into description</button>
      </div>
    </div>
  )
}
