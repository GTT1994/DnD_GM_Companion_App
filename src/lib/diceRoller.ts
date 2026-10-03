// The dice tray's roller: reads what the GM types ("3d6+2", "d20 adv", "4d6kh3", "d%",
// "1d8+2d6-1") and rolls it, keeping every die so the tray can show which were kept or dropped.
// Also finds dice in rules text ("8d6 fire damage") so they can be made clickable.

import { rollDie, type Random } from './dice'

// One part of a roll: a group of dice ("4d6kh3") or a flat number ("+2").
type DiceTerm = { sign: 1 | -1; count: number; sides: number; keep?: { highest: boolean; n: number } }
type FlatTerm = { sign: 1 | -1; flat: number }
type Term = DiceTerm | FlatTerm

export type RolledDie = { sides: number; value: number; kept: boolean }
export type RolledTerm = { sign: 1 | -1; text: string; dice?: RolledDie[]; flat?: number }
export type DiceRoll = { id: string; expression: string; label?: string; total: number; terms: RolledTerm[]; at: number }

const MAX_DICE = 100     // per group, so a typo like 10000d6 doesn't freeze the page
const MAX_SIDES = 1000

// Reads the text into terms, or returns a message saying what's wrong.
export function parseRoll(expression: string): Term[] | string {
  let text = expression.trim().toLowerCase().replace(/[−–]/g, '-')
  // "adv" / "dis" at the end turns each single d20 into 2d20, keeping the higher / lower.
  const mode = text.match(/(^|\s)(adv|advantage|dis|disadvantage)$/)
  if (mode) text = text.slice(0, mode.index).trim() || 'd20'  // "adv" on its own means d20 adv
  if (!text) return 'Type some dice, e.g. 3d6+2'
  // Spaces are fine around + and -, but not inside a term ("2d6 3" is a mistake, not "2d63").
  text = text.replace(/\s*([+-])\s*/g, '$1')
  if (/\s/.test(text)) return `Couldn't read "${expression.trim()}"`

  // Each term: optional sign, then "NdS" with an optional keep ("kh3", "kl1", "k3"), or a number.
  const termPattern = /([+-]?)(?:(\d*)d(\d+|%)(?:(kh|kl|k)(\d+))?|(\d+))/y
  const terms: Term[] = []
  let at = 0
  while (at < text.length) {
    termPattern.lastIndex = at
    const m = termPattern.exec(text)
    if (!m || (terms.length > 0 && !m[1])) return `Couldn't read "${expression.trim()}"`
    at = termPattern.lastIndex
    const sign = m[1] === '-' ? -1 : 1
    if (m[6] !== undefined) {
      terms.push({ sign, flat: parseInt(m[6]) })
      continue
    }
    const count = m[2] ? parseInt(m[2]) : 1
    const sides = m[3] === '%' ? 100 : parseInt(m[3])
    if (count < 1 || count > MAX_DICE) return `Roll between 1 and ${MAX_DICE} dice at a time`
    if (sides < 2 || sides > MAX_SIDES) return `Dice need between 2 and ${MAX_SIDES} sides`
    const term: DiceTerm = { sign, count, sides }
    if (m[4]) {
      const n = parseInt(m[5])
      if (n < 1 || n > count) return `Can't keep ${n} of ${count} dice`
      term.keep = { highest: m[4] !== 'kl', n }
    }
    terms.push(term)
  }

  if (mode) {
    const highest = mode[2].startsWith('adv')
    const d20s = terms.filter((t): t is DiceTerm => 'sides' in t && t.sides === 20 && t.count === 1 && !t.keep)
    if (!d20s.length) return 'Advantage and disadvantage need a d20'
    for (const t of d20s) Object.assign(t, { count: 2, keep: { highest, n: 1 } })
  }
  return terms
}

// How a term is written, e.g. "4d6kh3" or "2".
function termText(t: Term): string {
  if ('flat' in t) return `${t.flat}`
  return `${t.count}d${t.sides}${t.keep ? `${t.keep.highest ? 'kh' : 'kl'}${t.keep.n}` : ''}`
}

// Rolls the text. Returns the roll, or a message if the text isn't dice.
export function rollExpression(expression: string, label?: string, random: Random = Math.random): DiceRoll | string {
  const terms = parseRoll(expression)
  if (typeof terms === 'string') return terms
  let total = 0
  const rolled: RolledTerm[] = terms.map((t) => {
    if ('flat' in t) {
      total += t.sign * t.flat
      return { sign: t.sign, text: termText(t), flat: t.flat }
    }
    const dice: RolledDie[] = Array.from({ length: t.count }, () => ({ sides: t.sides, value: rollDie(t.sides, random), kept: true }))
    if (t.keep) {
      // Sort positions by value (highest first for "keep highest"), keep the first n.
      const order = dice.map((_, i) => i).sort((a, b) => (t.keep!.highest ? dice[b].value - dice[a].value : dice[a].value - dice[b].value))
      order.slice(t.keep.n).forEach((i) => (dice[i].kept = false))
    }
    total += t.sign * dice.filter((d) => d.kept).reduce((sum, d) => sum + d.value, 0)
    return { sign: t.sign, text: termText(t), dice }
  })
  return { id: crypto.randomUUID(), expression: expression.trim(), label, total, terms: rolled, at: Date.now() }
}

// Dice written in rules text: "8d6", "d20", "2d4 + 2", "1d10 − 1". The \b stops "2" in "1d8 + 2d6"
// being read as a modifier.
export const DICE_IN_TEXT = /\b\d*d(?:\d+|%)(?:\s*[+−–-]\s*\d+\b(?!d))?/gi

// Splits text into plain parts and dice parts, e.g. "Take 8d6 fire" → ["Take ", {dice:"8d6"}, " fire"].
export function splitDiceText(text: string): (string | { dice: string })[] {
  const parts: (string | { dice: string })[] = []
  let last = 0
  for (const m of text.matchAll(DICE_IN_TEXT)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push({ dice: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
