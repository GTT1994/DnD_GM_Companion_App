// Dice rolling and small number helpers used across the app.
// Every function takes an optional random number source so tests can make rolls predictable.

export type Random = () => number  // returns a number from 0 (inclusive) to 1 (exclusive), like Math.random

// Rolls one die with the given number of sides, e.g. rollDie(20) for a d20.
export function rollDie(sides: number, random: Random = Math.random): number {
  return Math.floor(random() * sides) + 1
}

// Dice written as text, split into its dice (e.g. 8d6 and 2d8) and a flat modifier.
export type ParsedDice = { dice: { count: number; sides: number }[]; modifier: number }

// Reads dice written as text: "2d6+3", "d20", "1d8 - 1", "8d6 + 2d8", or a flat number like "5".
// Returns null if the text isn't dice.
export function parseDice(expression: string): ParsedDice | null {
  const text = expression.replace(/\s/g, '')
  // The whole text must be terms like "2d6", "+3" or "-1d4", one after another.
  if (!/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/i.test(text)) return null
  const parsed: ParsedDice = { dice: [], modifier: 0 }
  for (const [, sign, term] of text.matchAll(/([+-]?)(\d*d\d+|\d+)/gi)) {
    if (/d/i.test(term)) {
      if (sign === '-') return null  // subtracting dice isn't supported
      const [count, sides] = term.toLowerCase().split('d')
      parsed.dice.push({ count: count ? parseInt(count) : 1, sides: parseInt(sides) })
    } else {
      parsed.modifier += sign === '-' ? -parseInt(term) : parseInt(term)
    }
  }
  return parsed
}

// Writes parsed dice back as text, e.g. { dice: [8d6], modifier: 3 } → "8d6+3".
export function formatDice(parsed: ParsedDice): string {
  const dice = parsed.dice.filter((d) => d.count > 0).map((d) => `${d.count}d${d.sides}`).join('+')
  if (!dice) return `${parsed.modifier}`
  return parsed.modifier ? `${dice}${parsed.modifier > 0 ? '+' : ''}${parsed.modifier}` : dice
}

// Adds two dice expressions, combining dice of the same size: "8d6" + "2d6" → "10d6".
export function addDice(a: string, b: string): string {
  const left = parseDice(a)
  const right = parseDice(b)
  if (!left || !right) throw new Error(`Not dice: ${a} / ${b}`)
  const dice = [...left.dice]
  for (const d of right.dice) {
    const same = dice.find((x) => x.sides === d.sides)
    if (same) same.count += d.count
    else dice.push({ ...d })
  }
  return formatDice({ dice, modifier: left.modifier + right.modifier })
}

// Multiplies the number of dice (not the modifier): ("1d10", 3) → "3d10".
export function multiplyDice(expression: string, times: number): string {
  const parsed = parseDice(expression)
  if (!parsed) throw new Error(`Not dice: ${expression}`)
  return formatDice({ ...parsed, dice: parsed.dice.map((d) => ({ ...d, count: d.count * times })) })
}

// Rolls dice written as text. With crit: true the number of dice is doubled (a critical hit),
// but not the modifier. Returns the total, each die's result and the modifier.
export function rollDice(expression: string, options: { crit?: boolean; random?: Random } = {}) {
  const parsed = parseDice(expression)
  if (!parsed) throw new Error(`Not a dice expression: ${expression}`)
  const rolls = parsed.dice.flatMap((d) =>
    Array.from({ length: options.crit ? d.count * 2 : d.count }, () => rollDie(d.sides, options.random)))
  return { total: rolls.reduce((sum, r) => sum + r, 0) + parsed.modifier, rolls, modifier: parsed.modifier }
}

// Rolls dice written as text, e.g. "2d6+3" or "d20". Returns the total and each die's result.
export function roll(expression: string, random: Random = Math.random): { total: number; rolls: number[] } {
  const { total, rolls } = rollDice(expression, { random })
  return { total, rolls }
}

// The modifier for an ability score, e.g. 14 → +2, 9 → -1.
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

// Shows a number with its sign, e.g. 2 → "+2", -1 → "-1".
export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

// Picks a random item from a list.
export function pick<T>(list: readonly T[], random: Random = Math.random): T {
  return list[Math.floor(random() * list.length)]
}

// Picks a key using weights, e.g. { Rare: 30, 'Very Rare': 5 } picks Rare 6 times as often.
export function pickWeighted<K extends string>(weights: Partial<Record<K, number>>, random: Random = Math.random): K {
  const entries = Object.entries(weights) as [K, number][]
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let target = random() * total
  for (const [key, weight] of entries) {
    target -= weight
    if (target < 0) return key
  }
  return entries[entries.length - 1][0]
}

// Shows a challenge rating the way stat blocks do: 0.5 → "1/2".
export function formatCr(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return `${cr}`
}
