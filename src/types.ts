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
}

// Everything the combat tracker saves between page loads.
export type CombatState = {
  combatants: Combatant[]
  round: number            // 0 = combat not started yet
  activeId: string | null  // whose turn it is
}

// The pages of the app, shown as tabs in the header.
export type Page = 'combat' | 'lookup' | 'generators'

// The kinds of SRD entry that Quick Lookup can show.
export type LookupCategory = 'conditions' | 'monsters' | 'spells' | 'magic-items' | 'rules'

// What Quick Lookup is showing: the category tab, the search text and the open entry.
export type LookupState = {
  category: LookupCategory | 'all'
  query: string
  selected: { category: LookupCategory; index: string } | null
}
