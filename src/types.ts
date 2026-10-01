// Shared data types used across the app.
// A type describes the shape of the data (like a CREATE TABLE definition) but stores nothing.

// One creature taking part in combat: a player character or a monster.
export type Combatant = {
    id: string          // unique ID for this combatant, used as the React list key
    name: string
    hp: number          // current hit points
    maxHp: number       // hit points when fully healed
    ac: number          // armour class
    initiative: number  // initiative roll, decides turn order
    isPlayer: boolean   // true = player character, false = monster
}
