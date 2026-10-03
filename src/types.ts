// Shared data types used across the app.
// A type describes the shape of the data (like a CREATE TABLE definition) but stores nothing.

import type { RichDoc } from './lib/richText'

// Which version of the 5e rules to show.
export type Edition = '2014' | '2024'

// One creature taking part in combat: a player character or a monster.
export type Combatant = {
  id: string            // unique ID for this combatant, used as the React list key
  name: string
  hp: number            // current hit points
  maxHp: number         // hit points when fully healed
  tempHp: number        // temporary hit points, lost before real HP
  ac: number            // armour class
  initiative: number    // initiative roll, decides turn order
  isPlayer: boolean     // true = player character, false = monster
  conditions: string[]  // names of active conditions, e.g. "Prone"
  timers?: Record<string, ConditionTimer>  // durations for some of those conditions, by condition name
  monster?: { edition: Edition; index: string }  // the SRD monster it came from, if any
  pcId?: string         // the party member it represents, if any (their HP is kept in sync)
  pcDefenses?: PcDefenses        // a PC's damage resistances etc., copied from the party member
  uses?: Record<string, number>  // limited-use abilities spent this fight, e.g. { "slot:3": 2, "feature:Fire Breath": 1 }
  legendaryMax?: number          // legendary actions per round (defaults to 3)
  lair?: Lair                    // set for a lair: its turn lists lair actions instead of HP and attacks
  inLair?: boolean               // a monster fighting in its lair (e.g. 4/Day Legendary Resistance instead of 3)
}

// A lair in the turn order (usually initiative 20, losing ties), with its lair actions typed in by the GM.
export type Lair = {
  actions: string[]
  used?: { index: number; round: number }  // the last lair action used; it can't be used again the next round
}

// One line in the combat's roll history.
export type LogEntry = {
  id: string
  text: string
}

// Everything the combat tracker saves between page loads.
// How long a condition lasts. Conditions without a timer last until removed.
export type ConditionTimer =
  // A number of rounds, counted down at the end of the affected creature's turns.
  | { kind: 'rounds'; rounds: number; skip?: boolean }
  // Until the start or end of someone's next turn (e.g. the caster's, not always the target's).
  | { kind: 'turn'; when: 'start' | 'end'; ownerId: string; skip?: boolean }
  // A saving throw at the end of each of the affected creature's turns; a success ends it.
  | { kind: 'save'; ability: Ability; dc: number }
// skip: set when the timer starts during the turn it counts, so that turn ending doesn't count
// (e.g. "until the end of its next turn" given on its own turn means the following turn).

export type Ability = 'Str' | 'Dex' | 'Con' | 'Int' | 'Wis' | 'Cha'

// A saving throw waiting for the GM: to end a condition ("save ends"), or to keep concentrating.
export type PendingSave = {
  id: string
  combatantId: string
  ability: Ability
  dc: number
  condition: string                     // the condition the save is about
  reason: 'ends' | 'concentration'      // a success ends the condition / a failure ends concentration
}

export type CombatState = {
  combatants: Combatant[]
  round: number            // 0 = combat not started yet
  activeId: string | null  // whose turn it is
  log?: LogEntry[]         // recent rolls, newest first
  pendingSaves?: PendingSave[]  // saves to roll or ask the player for
  notices?: string[]       // what changed at the last turn change, e.g. "Goblin is no longer Restrained"
}

// The kinds of SRD entry that Quick Lookup can show.
export type LookupCategory = 'conditions' | 'monsters' | 'spells' | 'magic-items' | 'equipment' | 'rules'

// What Quick Lookup is showing: the category tab, the search text and the open entry.
export type LookupState = {
  category: LookupCategory | 'all'
  query: string
  selected: { category: LookupCategory; index: string } | null
}

// A campaign: the top-level folder for a party, their fights, NPCs and notes.
export type Campaign = {
  id: string
  name: string
  description: string
  createdAt: number     // milliseconds since 1970, like a DATETIME
  lastOpenedAt: number
}

// A player character in a campaign's party.
// Damage types a PC resists, is immune to, or is vulnerable to, e.g. { resistant: ['Fire'], ... }.
export type PcDefenses = { resistant: string[]; immune: string[]; vulnerable: string[] }

export type Pc = {
  id: string
  campaignId: string    // which campaign this PC belongs to (a foreign key)
  name: string
  playerName: string
  className: string     // e.g. "Fighter"
  level: number
  ac: number
  maxHp: number
  currentHp: number     // carries over between fights until healed
  tempHp: number
  passivePerception: number
  passiveInsight: number
  passiveInvestigation: number
  defenses?: PcDefenses   // missing for PCs saved before resistances existed
}

// A campaign's free-text notes page.
// A campaign's notes: the plan for the next session and the ongoing campaign notes,
// both formatted (stored as the editor's document, see lib/richText.ts).
export type Note = {
  campaignId: string
  doc: RichDoc          // campaign notes
  plan: RichDoc         // this session's plan
  updatedAt: number
}

// A past session in the session log, saved by "End session".
export type Session = {
  id: string
  campaignId: string
  number: number        // 1, 2, 3…
  date: string          // YYYY-MM-DD
  title: string
  recap: RichDoc
  plan: RichDoc         // the plan as it was at the end of the session
  createdAt: number
  updatedAt: number
}

// A monster in a prepared encounter, and how many of it. XP and CR are copied in so the
// difficulty can be shown without loading the rules data.
export type EncounterMonster = {
  edition: Edition
  index: string         // SRD index, or "hb-..." for homebrew
  name: string
  count: number
  xp: number
  cr: number
}

// A fight prepared in advance for a campaign.
export type Encounter = {
  id: string
  campaignId: string
  name: string
  notes: string
  status: 'planned' | 'used'
  hpMode: 'average' | 'roll'   // use the stat block's average HP, or roll each monster's hit dice
  monsters: EncounterMonster[]
  updatedAt: number
}

// How an NPC feels about the party (the 5e social interaction attitudes).
export type NpcAttitude = 'friendly' | 'indifferent' | 'hostile'
export type NpcStatus = 'alive' | 'dead' | 'missing' | 'unknown'

// A non-player character in a campaign: written by the GM or saved from the generator.
export type Npc = {
  id: string
  campaignId: string
  name: string
  species: string
  gender: string
  role: string          // occupation, e.g. "Innkeeper"
  location: string      // where the party can find them
  faction: string
  attitude: NpcAttitude
  status: NpcStatus
  appearance: string
  personality: string
  mannerism: string     // voice or mannerism
  motivation: string
  secret: string
  notes: string         // Markdown
  portrait?: string     // a small image, stored as a data URL ("data:image/jpeg;base64,...")
  statBlock?: { edition: Edition; index: string; name: string }  // the monster they fight as
  savedAt: number       // when they were added
  updatedAt: number
}
