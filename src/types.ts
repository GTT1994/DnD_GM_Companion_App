// Shared data types used across the app.
// A type describes the shape of the data (like a CREATE TABLE definition) but stores nothing.

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
  monster?: { edition: Edition; index: string }  // the SRD monster it came from, if any
  pcId?: string         // the party member it represents, if any (their HP is kept in sync)
  uses?: Record<string, number>  // limited-use abilities spent this fight, e.g. { "slot:3": 2, "feature:Fire Breath": 1 }
  legendaryMax?: number          // legendary actions per round (defaults to 3)
}

// One line in the combat's roll history.
export type LogEntry = {
  id: string
  text: string
}

// Everything the combat tracker saves between page loads.
export type CombatState = {
  combatants: Combatant[]
  round: number            // 0 = combat not started yet
  activeId: string | null  // whose turn it is
  log?: LogEntry[]         // recent rolls, newest first
}

// The kinds of SRD entry that Quick Lookup can show.
export type LookupCategory = 'conditions' | 'monsters' | 'spells' | 'magic-items' | 'rules'

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
}

// A campaign's free-text notes page.
export type Note = {
  campaignId: string
  text: string
  updatedAt: number
}
