// Damage resistances, immunities and vulnerabilities: reading them from a stat block's text,
// gathering everything that applies to one combatant (stat block, PC sheet, temporary conditions
// like "Resistant: Fire"), and working out how much damage they actually take.

import type { Combatant, PcDefenses } from '../types'
import type { Monster } from '../data/srd'
import { DAMAGE_TYPES } from './homebrew'

export type Defense = 'resistant' | 'immune' | 'vulnerable'

export const DEFENSES: Defense[] = ['resistant', 'immune', 'vulnerable']
export const DEFENSE_LABELS: Record<Defense, string> = { resistant: 'Resistant', immune: 'Immune', vulnerable: 'Vulnerable' }
export const DEFENSE_SHORT: Record<Defense, string> = { resistant: 'Res', immune: 'Imm', vulnerable: 'Vuln' }

// One rule, e.g. resistant to bludgeoning, but only from nonmagical attacks.
export type DefenseRule = { kind: Defense; type: string; nonmagicalOnly?: boolean }

export type Defenses = {
  rules: DefenseRule[]
  notes: { kind: Defense; text: string }[]  // conditions the app can't check, e.g. "from magic weapons wielded by good creatures"
  conditionImmunities: string[]             // e.g. ["Charmed", "Frightened"]
}

export const noDefenses = (): Defenses => ({ rules: [], notes: [], conditionImmunities: [] })

const PHYSICAL = ['bludgeoning', 'piercing', 'slashing']
const TYPES = DAMAGE_TYPES.map((t) => t.toLowerCase())

// Reads one stat block line, e.g. "cold, fire" or "lightning, bludgeoning, piercing, and slashing
// from nonmagical weapons that aren't silvered". Types before a "from nonmagical…" qualifier are
// unconditional; the physical types it qualifies only count against nonmagical attacks. Any other
// qualifier ("from magic weapons wielded by good creatures") becomes a note for the GM.
export function parseDefenses(text: string | undefined, kind: Defense): Pick<Defenses, 'rules' | 'notes'> {
  const result: Pick<Defenses, 'rules' | 'notes'> = { rules: [], notes: [] }
  for (const part of (text ?? '').toLowerCase().split(';').map((p) => p.trim()).filter(Boolean)) {
    const types = TYPES.filter((t) => new RegExp(`\\b${t}\\b`).test(part))
    const qualified = /\b(from|that|wielded|damage from)\b/.test(part)
    if (types.length === 0) {
      result.notes.push({ kind, text: part })  // e.g. "damage type chosen for the draconic origin trait below"
    } else if (!qualified) {
      result.rules.push(...types.map((type) => ({ kind, type })))
    } else if (part.includes('nonmagical')) {
      result.rules.push(...types.map((type) => (PHYSICAL.includes(type) ? { kind, type, nonmagicalOnly: true } : { kind, type })))
      // Silvered / adamantine weapons, or "damage from spells": the GM decides (tick Magical to skip).
      if (/silvered|adamantine|spells/.test(part)) result.notes.push({ kind, text: part })
    } else {
      result.notes.push({ kind, text: part })
    }
  }
  return result
}

// Everything that applies to a combatant: its stat block (monsters), its character sheet (PCs),
// and temporary conditions such as "Resistant: Fire".
export function combatantDefenses(c: Combatant, monster?: Pick<Monster, 'resistances' | 'immunities' | 'vulnerabilities' | 'conditionImmunities'>): Defenses {
  const result = noDefenses()
  if (monster) {
    const parts = [parseDefenses(monster.resistances, 'resistant'), parseDefenses(monster.immunities, 'immune'), parseDefenses(monster.vulnerabilities, 'vulnerable')]
    for (const p of parts) {
      result.rules.push(...p.rules)
      result.notes.push(...p.notes)
    }
    result.conditionImmunities = (monster.conditionImmunities ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  }
  result.rules.push(...fromPcDefenses(c.pcDefenses).rules)
  for (const condition of c.conditions) {
    const temporary = parseTemporary(condition)
    if (temporary) result.rules.push(temporary)
  }
  return result
}

// The condition name for a temporary defence, e.g. "Resistant: Fire", and reading it back.
export const temporaryCondition = (kind: Defense, type: string) => `${DEFENSE_LABELS[kind]}: ${type}`
export function parseTemporary(condition: string): DefenseRule | undefined {
  const match = condition.match(/^(Resistant|Immune|Vulnerable): (\w+)$/)
  if (!match) return undefined
  const kind = DEFENSES.find((k) => DEFENSE_LABELS[k] === match[1])!
  return { kind, type: match[2].toLowerCase() }
}

// The defences that apply to one hit of a damage type (none for untyped damage).
export function applicable(defenses: Defenses, damageType: string | undefined, magical = false): Set<Defense> {
  const type = damageType?.toLowerCase()
  const kinds = new Set<Defense>()
  if (!type) return kinds
  for (const rule of defenses.rules) {
    if (rule.type === type && !(rule.nonmagicalOnly && magical)) kinds.add(rule.kind)
  }
  return kinds
}

export type Adjusted = { amount: number; kinds: Set<Defense> }

// Damage after defences: immune → 0; resistant → half (rounded down); vulnerable → double.
// Resistance and vulnerability to the same hit both apply (half, then double). Several sources of
// the same defence don't stack.
export function adjustDamage(amount: number, defenses: Defenses, damageType: string | undefined, magical = false): Adjusted {
  const kinds = applicable(defenses, damageType, magical)
  if (kinds.has('immune')) return { amount: 0, kinds: new Set(['immune']) }
  let result = amount
  if (kinds.has('resistant')) result = Math.floor(result / 2)
  if (kinds.has('vulnerable')) result *= 2
  return { amount: result, kinds }
}

// Damage made of several parts (e.g. 7 slashing + 9 fire), each with its own type. "half" is for a
// successful save: each part is halved first, then defences apply.
export function adjustParts(parts: { total: number; type?: string }[], defenses: Defenses, options: { half?: boolean; magical?: boolean } = {}): Adjusted {
  const kinds = new Set<Defense>()
  let amount = 0
  for (const part of parts) {
    const base = options.half ? Math.floor(part.total / 2) : part.total
    const r = adjustDamage(base, defenses, part.type, options.magical)
    amount += r.amount
    r.kinds.forEach((k) => kinds.add(k))
  }
  return { amount, kinds }
}

// e.g. "½ fire", "immune", "×2 radiant", for buttons and the roll history.
export function adjustmentLabel(kinds: Set<Defense>, damageType?: string): string {
  if (kinds.size === 0) return ''
  if (kinds.has('immune')) return 'immune'
  const type = damageType ? ` ${damageType.toLowerCase()}` : ''
  if (kinds.has('resistant') && kinds.has('vulnerable')) return `res + vuln${type}`
  return kinds.has('resistant') ? `½${type}` : `×2${type}`
}

// Short tags for a tracker row or party card, e.g. ["Res fire, cold", "Imm poison"].
export function defenseTags(defenses: Defenses): { kind: Defense; text: string; title: string }[] {
  return DEFENSES.flatMap((kind) => {
    const rules = defenses.rules.filter((r) => r.kind === kind)
    const notes = defenses.notes.filter((n) => n.kind === kind)
    if (rules.length === 0 && notes.length === 0) return []
    const types = [...new Set(rules.map((r) => r.type + (r.nonmagicalOnly ? '*' : '')))]
    const text = [DEFENSE_SHORT[kind], types.join(', '), notes.length ? '⚠' : ''].filter(Boolean).join(' ')
    const title = [
      `${DEFENSE_LABELS[kind]}: ${types.join(', ') || '—'}`,
      types.some((t) => t.endsWith('*')) ? '* only from nonmagical attacks (tick Magical to ignore)' : '',
      ...notes.map((n) => `⚠ ${n.text} (not applied automatically)`),
    ].filter(Boolean).join('\n')
    return [{ kind, text, title }]
  })
}

// True if anything could change damage to this combatant, so its row gets the type picker.
export const hasDamageDefenses = (d: Defenses) => d.rules.length > 0 || d.notes.length > 0
export const hasNonmagicalRules = (d: Defenses) => d.rules.some((r) => r.nonmagicalOnly)

// PC sheet fields, empty.
export const emptyPcDefenses = (): PcDefenses => ({ resistant: [], immune: [], vulnerable: [] })

// A PC sheet's defences in the general form, e.g. for tags on a party card.
export function fromPcDefenses(d: PcDefenses | undefined): Defenses {
  return { rules: DEFENSES.flatMap((kind) => (d?.[kind] ?? []).map((type) => ({ kind, type: type.toLowerCase() }))), notes: [], conditionImmunities: [] }
}
