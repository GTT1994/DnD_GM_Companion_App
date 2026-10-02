// The random encounter generator: monsters from an environment, grouped in a believable way
// (a lone monster, a pair, a pack, a leader with followers, or two kinds together), sized to
// reach the chosen difficulty for the party using the same rules as the encounter builder.

import type { Edition, EncounterMonster } from '../types'
import type { Monster } from '../data/srd'
import { environmentsOf, type Environment } from '../data/environments'
import { difficulty } from './encounters'
import { pick, type Random } from './dice'

// The difficulties to choose from in each edition.
export const DIFFICULTIES: Record<Edition, string[]> = {
  '2014': ['Easy', 'Medium', 'Hard', 'Deadly'],
  '2024': ['Low', 'Moderate', 'High'],
}

const REASONS = [
  'hunting for food', 'guarding their lair', 'on patrol', 'fleeing something worse', 'lying in ambush',
  'lost and hungry', 'escorting a prisoner', 'searching for something they lost', 'returning from a raid',
  'drawn by the noise the party made', 'arguing over a kill', 'resting, and not expecting company',
  'following the party\'s tracks', 'guarding a treasure they don\'t understand', 'sent by someone else',
]

export type RandomEncounter = {
  id: string
  environment: Environment
  target: string        // the difficulty asked for
  rating: string        // the difficulty it actually came out as
  monsters: EncounterMonster[]
  reason: string
  edition: Edition
}

type Shape = 'solo' | 'pair' | 'pack' | 'leader' | 'mixed'

const between = (low: number, high: number, random: Random) => low + Math.floor(random() * (high - low + 1))
const ref = (m: Monster, count: number, edition: Edition): EncounterMonster =>
  ({ edition, index: m.index, name: m.name, count, xp: m.xp, cr: m.cr })

// One random group of a given shape from the candidates.
function tryShape(shape: Shape, candidates: Monster[], edition: Edition, random: Random): EncounterMonster[] {
  const a = pick(candidates, random)
  switch (shape) {
    case 'solo':
      return [ref(a, 1, edition)]
    case 'pair':
      return [ref(a, 2, edition)]
    case 'pack':
      return [ref(a, between(3, 8, random), edition)]
    case 'leader': {
      // A stronger leader with weaker followers.
      const weaker = candidates.filter((m) => m.cr < a.cr)
      if (!weaker.length) return [ref(a, 1, edition)]
      return [ref(a, 1, edition), ref(pick(weaker, random), between(2, 6, random), edition)]
    }
    case 'mixed': {
      const b = pick(candidates.filter((m) => m.index !== a.index), random) ?? a
      return [ref(a, between(1, 3, random), edition), ...(b === a ? [] : [ref(b, between(1, 3, random), edition)])]
    }
  }
}

// Tries many random groups and keeps one that matches the difficulty, or the closest one found.
// Returns null when the environment has no monsters for this edition.
export function generateEncounter(
  edition: Edition,
  monsters: Monster[],
  environment: Environment,
  target: string,
  levels: number[],
  random: Random = Math.random,
): RandomEncounter | null {
  const candidates = monsters.filter((m) => m.xp > 0 && environmentsOf(m).includes(environment))
  if (!candidates.length || !levels.length) return null
  const order = DIFFICULTIES[edition]
  const wanted = order.indexOf(target)
  // How far a rating is from the target (2014 "Trivial" sits below Easy; 2024 "Beyond High" above High).
  const distance = (rating: string) => {
    const i = rating === 'Trivial' || rating === 'None' ? -1 : rating === 'Beyond High' ? order.length : order.indexOf(rating)
    return Math.abs(i - wanted)
  }

  let best: { monsters: EncounterMonster[]; rating: string; score: number } | null = null
  const shapes: Shape[] = ['solo', 'pair', 'pack', 'leader', 'mixed']
  for (let attempt = 0; attempt < 400; attempt++) {
    const group = tryShape(pick(shapes, random), candidates, edition, random)
    const rating = difficulty(edition, levels, group).rating
    const score = distance(rating)
    if (!best || score < best.score) best = { monsters: group, rating, score }
    if (score === 0) break
  }
  return {
    id: crypto.randomUUID(),
    environment,
    target,
    rating: best!.rating,
    monsters: best!.monsters,
    reason: pick(REASONS, random),
    edition,
  }
}
