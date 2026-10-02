// Prepared encounters: difficulty for the party (2014 and 2024 rules), and loading an
// encounter's monsters into the campaign's fight.

import { db } from '../db'
import type { Combatant, Edition, Encounter, EncounterMonster } from '../types'
import { loadSrd, type Monster } from '../data/srd'
import { abilityMod, parseDice, rollDice, rollDie, type Random } from './dice'
import { uniqueName } from './combat'
import { applyCombatAction, getCombat } from './store'

// --- Difficulty: 2014 rules ------------------------------------------------------------------

// XP thresholds per character level: [easy, medium, hard, deadly].
const THRESHOLDS_2014: Record<number, [number, number, number, number]> = {
  1: [25, 50, 75, 100], 2: [50, 100, 150, 200], 3: [75, 150, 225, 400], 4: [125, 250, 375, 500],
  5: [250, 500, 750, 1100], 6: [300, 600, 900, 1400], 7: [350, 750, 1100, 1700], 8: [450, 900, 1400, 2100],
  9: [550, 1100, 1600, 2400], 10: [600, 1200, 1900, 2800], 11: [800, 1600, 2400, 3600], 12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100], 14: [1250, 2500, 3800, 5700], 15: [1400, 2800, 4300, 6400], 16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800], 18: [2100, 4200, 6300, 9500], 19: [2400, 4900, 7300, 10900], 20: [2800, 5700, 8500, 12700],
}

// Encounter multipliers, from fewest monsters to most. Small and large parties shift one step along.
const MULTIPLIERS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5]

export function multiplier2014(monsterCount: number, partySize: number): number {
  let step = monsterCount <= 1 ? 1 : monsterCount === 2 ? 2 : monsterCount <= 6 ? 3 : monsterCount <= 10 ? 4 : monsterCount <= 14 ? 5 : 6
  if (partySize < 3) step += 1        // a small party finds fights harder
  else if (partySize >= 6) step -= 1  // a large party finds them easier
  return MULTIPLIERS[step]
}

export type Difficulty = {
  edition: Edition
  rating: string                                // e.g. "Hard"
  xp: number                                    // total monster XP
  compareXp: number                             // what's compared to the thresholds (adjusted XP in 2014)
  multiplier?: number                           // 2014 only
  thresholds: { label: string; xp: number }[]   // in order, lowest first
}

const clampLevel = (level: number) => Math.min(20, Math.max(1, level))

// 2014: total XP × multiplier, compared with the party's thresholds added together.
export function difficulty2014(levels: number[], monsters: EncounterMonster[]): Difficulty {
  const xp = monsters.reduce((sum, m) => sum + m.xp * m.count, 0)
  const count = monsters.reduce((sum, m) => sum + m.count, 0)
  const multiplier = multiplier2014(count, levels.length)
  const compareXp = Math.round(xp * multiplier)
  const labels = ['Easy', 'Medium', 'Hard', 'Deadly']
  const thresholds = labels.map((label, i) => ({ label, xp: levels.reduce((sum, l) => sum + THRESHOLDS_2014[clampLevel(l)][i], 0) }))
  // The highest threshold reached; below Easy is Trivial.
  const reached = thresholds.filter((t) => compareXp >= t.xp)
  return { edition: '2014', rating: reached.at(-1)?.label ?? 'Trivial', xp, compareXp, multiplier, thresholds }
}

// --- Difficulty: 2024 rules ------------------------------------------------------------------

// XP budget per character level: [low, moderate, high].
const BUDGETS_2024: Record<number, [number, number, number]> = {
  1: [50, 75, 100], 2: [100, 150, 200], 3: [150, 225, 400], 4: [250, 375, 500], 5: [500, 750, 1100],
  6: [600, 1000, 1400], 7: [750, 1300, 1700], 8: [1000, 1700, 2100], 9: [1300, 2000, 2600], 10: [1600, 2300, 3100],
  11: [1900, 2900, 4100], 12: [2200, 3700, 4700], 13: [2600, 4200, 5400], 14: [2900, 4900, 6200], 15: [3300, 5400, 7800],
  16: [3800, 6100, 9800], 17: [4500, 7200, 11700], 18: [5000, 8700, 14200], 19: [5500, 10700, 17200], 20: [6400, 13200, 22000],
}

// 2024: total XP compared with the party's budgets (each is the most you'd spend for that difficulty).
export function difficulty2024(levels: number[], monsters: EncounterMonster[]): Difficulty {
  const xp = monsters.reduce((sum, m) => sum + m.xp * m.count, 0)
  const labels = ['Low', 'Moderate', 'High']
  const thresholds = labels.map((label, i) => ({ label, xp: levels.reduce((sum, l) => sum + BUDGETS_2024[clampLevel(l)][i], 0) }))
  // The first budget the XP fits within; over the High budget is Beyond High.
  const rating = xp === 0 ? 'None' : thresholds.find((t) => xp <= t.xp)?.label ?? 'Beyond High'
  return { edition: '2024', rating, xp, compareXp: xp, thresholds }
}

export function difficulty(edition: Edition, levels: number[], monsters: EncounterMonster[]): Difficulty {
  return edition === '2014' ? difficulty2014(levels, monsters) : difficulty2024(levels, monsters)
}

// --- Encounters ------------------------------------------------------------------------------

export async function createEncounter(campaignId: string): Promise<string> {
  const id = crypto.randomUUID()
  await db.encounters.add({
    id, campaignId, name: 'New encounter', notes: '', status: 'planned', hpMode: 'average', monsters: [], updatedAt: Date.now(),
  })
  return id
}

export async function duplicateEncounter(encounter: Encounter): Promise<string> {
  const id = crypto.randomUUID()
  await db.encounters.add({ ...structuredClone(encounter), id, name: `${encounter.name} (copy)`, status: 'planned', updatedAt: Date.now() })
  return id
}

export function saveEncounter(encounter: Encounter) {
  return db.encounters.put({ ...encounter, updatedAt: Date.now() })
}

// e.g. "4 × Goblin Warrior, Goblin Boss".
export function encounterSummary(encounter: Encounter): string {
  if (encounter.monsters.length === 0) return 'No monsters yet'
  return encounter.monsters.map((m) => (m.count > 1 ? `${m.count} × ${m.name}` : m.name)).join(', ')
}

// Finds the full monster for an encounter entry: homebrew from the database, SRD from the rules files.
export async function resolveMonster(ref: Pick<EncounterMonster, 'edition' | 'index'>): Promise<Monster | undefined> {
  if (ref.index.startsWith('hb-')) return db.homebrewMonsters.get(ref.index)
  return (await loadSrd(ref.edition, 'monsters')).find((m) => m.index === ref.index)
}

export type LoadGroup = { ref: EncounterMonster; monster: Monster }

// Starting HP for one monster: the stat block's average, or its hit dice rolled (at least 1).
export function startingHp(monster: Monster, hpMode: Encounter['hpMode'], random: Random = Math.random): number {
  if (hpMode === 'roll' && monster.hitDice && parseDice(monster.hitDice)) {
    return Math.max(1, rollDice(monster.hitDice, { random }).total)
  }
  return monster.hp
}

// Loads an encounter into its campaign's fight. "replace" first removes the monsters already there
// (the party stays). Each group of identical monsters shares one initiative roll.
export function loadEncounter(encounter: Encounter, groups: LoadGroup[], mode: 'replace' | 'add', random: Random = Math.random) {
  const combatId = encounter.campaignId
  return db.transaction('rw', [db.combats, db.pcs, db.encounters], async () => {
    if (mode === 'replace') await applyCombatAction(combatId, { type: 'clearMonsters' })
    const existing = (await getCombat(combatId)).combatants
    const added: Combatant[] = []
    for (const { ref, monster } of groups) {
      const initiative = rollDie(20, random) + abilityMod(monster.abilities[1])  // one roll for the whole group
      for (let i = 0; i < ref.count; i++) {
        const hp = startingHp(monster, encounter.hpMode, random)
        added.push({
          id: crypto.randomUUID(),
          name: uniqueName(monster.name, [...existing, ...added]),
          initiative,
          hp,
          maxHp: hp,
          tempHp: 0,
          ac: monster.ac,
          isPlayer: false,
          conditions: [],
          monster: { edition: ref.edition, index: ref.index },
        })
      }
    }
    if (added.length) await applyCombatAction(combatId, { type: 'add', combatants: added })
    await db.encounters.update(encounter.id, { status: 'used', updatedAt: Date.now() })
    return added.length
  })
}
