// Dice rolling and small number helpers used across the app.
// Every function takes an optional random number source so tests can make rolls predictable.

export type Random = () => number  // returns a number from 0 (inclusive) to 1 (exclusive), like Math.random

// Rolls one die with the given number of sides, e.g. rollDie(20) for a d20.
export function rollDie(sides: number, random: Random = Math.random): number {
  return Math.floor(random() * sides) + 1
}

// Reads dice written as text: "2d6+3", "d20", "1d8 - 1", or a flat number like "5".
// Returns null if the text isn't dice.
export function parseDice(expression: string): { count: number; sides: number; modifier: number } | null {
  const text = expression.replace(/\s/g, '')
  if (/^[+-]?\d+$/.test(text)) return { count: 0, sides: 0, modifier: parseInt(text) }
  const match = text.match(/^(\d*)d(\d+)([+-]\d+)?$/i)
  if (!match) return null
  return { count: match[1] ? parseInt(match[1]) : 1, sides: parseInt(match[2]), modifier: match[3] ? parseInt(match[3]) : 0 }
}

// Rolls dice written as text. With crit: true the number of dice is doubled (a critical hit),
// but not the modifier. Returns the total, each die's result and the modifier.
export function rollDice(expression: string, options: { crit?: boolean; random?: Random } = {}) {
  const dice = parseDice(expression)
  if (!dice) throw new Error(`Not a dice expression: ${expression}`)
  const count = options.crit ? dice.count * 2 : dice.count
  const rolls = Array.from({ length: count }, () => rollDie(dice.sides, options.random))
  return { total: rolls.reduce((sum, r) => sum + r, 0) + dice.modifier, rolls, modifier: dice.modifier }
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
