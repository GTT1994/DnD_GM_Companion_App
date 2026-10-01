// Dice rolling and small number helpers used across the app.
// Every function takes an optional random number source so tests can make rolls predictable.

export type Random = () => number  // returns a number from 0 (inclusive) to 1 (exclusive), like Math.random

// Rolls one die with the given number of sides, e.g. rollDie(20) for a d20.
export function rollDie(sides: number, random: Random = Math.random): number {
  return Math.floor(random() * sides) + 1
}

// Rolls dice written as text, e.g. "2d6+3" or "d20". Returns the total and each die's result.
export function roll(expression: string, random: Random = Math.random): { total: number; rolls: number[] } {
  const match = expression.replace(/\s/g, '').match(/^(\d*)d(\d+)([+-]\d+)?$/i)
  if (!match) throw new Error(`Not a dice expression: ${expression}`)
  const count = match[1] ? parseInt(match[1]) : 1
  const sides = parseInt(match[2])
  const modifier = match[3] ? parseInt(match[3]) : 0
  const rolls = Array.from({ length: count }, () => rollDie(sides, random))
  return { total: rolls.reduce((sum, r) => sum + r, 0) + modifier, rolls }
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
