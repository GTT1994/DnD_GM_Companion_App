// Mob attacks (DMG "Handling Mobs"): instead of rolling every attack from a crowd of identical
// monsters, look up how many attackers it takes for one to hit, based on the d20 roll needed.

import type { DamagePart } from '../data/srd'
import { rollDice, type Random } from './dice'

// The DMG's table: d20 roll needed → attackers needed for one hit.
export function attackersPerHit(needed: number): number {
  if (needed <= 5) return 1
  if (needed <= 12) return 2
  if (needed <= 14) return 3
  if (needed <= 16) return 4
  if (needed <= 18) return 5
  if (needed === 19) return 10
  return 20  // only a natural 20 hits
}

export type MobResult = {
  attackers: number
  needed: number          // the d20 roll needed to hit
  hits: number
  parts: { total: number; type: string }[]  // damage by type, all hits together (for resistances)
  total: number
}

// Works out the hits and rolls damage for each one.
export function mobAttack(attackers: number, bonus: number, ac: number, damage: DamagePart[], random?: Random): MobResult {
  const needed = Math.min(20, Math.max(1, ac - bonus))
  const hits = Math.floor(attackers / attackersPerHit(needed))
  // Add up each damage type over all the hits.
  const byType = new Map<string, number>()
  for (let i = 0; i < hits; i++) {
    for (const part of damage) byType.set(part.type, (byType.get(part.type) ?? 0) + rollDice(part.dice, { random }).total)
  }
  const parts = [...byType].map(([type, total]) => ({ type, total }))
  return { attackers, needed, hits, parts, total: parts.reduce((sum, p) => sum + p.total, 0) }
}
