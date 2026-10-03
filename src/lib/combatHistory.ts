// Names for combat tracker changes, shown on the Undo / Redo buttons, e.g. "8 damage to Thorin".
// Changes with no name (adding a roll to the history, dismissing notices) aren't kept for undo.

import type { CombatState } from '../types'
import type { CombatAction } from './combat'

export const HISTORY_LENGTH = 20  // how many changes Undo can go back

export function describeAction(action: CombatAction, before: CombatState): string | null {
  const name = (id: string) => before.combatants.find((c) => c.id === id)?.name ?? 'someone'
  switch (action.type) {
    case 'add':
      return action.combatants.length === 1 ? `add ${action.combatants[0].name}` : `add ${action.combatants.length} combatants`
    case 'remove':
      return `remove ${name(action.id)}`
    case 'damage':
      return `${action.amount} damage to ${name(action.id)}`
    case 'heal':
      return `heal ${name(action.id)} ${action.amount}`
    case 'setTempHp':
      return `${name(action.id)} temp HP`
    case 'setInitiative':
      return `${name(action.id)}'s initiative`
    case 'toggleCondition': {
      const has = before.combatants.find((c) => c.id === action.id)?.conditions.includes(action.condition)
      return `${has ? 'remove' : 'add'} ${action.condition} ${has ? 'from' : 'on'} ${name(action.id)}`
    }
    case 'addCondition':
      return `${action.condition} on ${name(action.id)}`
    case 'resolveSave':
    case 'dismissSave': {
      const save = before.pendingSaves?.find((s) => s.id === action.saveId)
      return save ? `${name(save.combatantId)}'s ${save.ability} save` : 'a save'
    }
    case 'nextTurn':
      return before.round === 0 ? 'start combat' : 'next turn'
    case 'previousTurn':
      return 'previous turn'
    case 'endCombat':
      return 'end combat'
    case 'resetCombat':
      return 'reset combat'
    case 'clearMonsters':
      return 'clear NPCs'
    case 'clearAll':
      return 'clear all'
    case 'setUse':
      return `${name(action.id)} uses`
    case 'setLegendaryMax':
      return `${name(action.id)} legendary actions`
    case 'concentrate':
      return `${name(action.id)} concentrates on ${action.spell}`
    case 'setLair':
      return `edit ${name(action.id)}`
    case 'useLairAction':
      return `${name(action.id)} action`
    case 'setInLair':
      return `${name(action.id)} ${action.inLair ? 'in' : 'out of'} lair`
    case 'batch':
      return action.label ?? 'several changes'
    case 'log':
    case 'clearNotices':
    case 'restore':
      return null
  }
}

export type HistoryEntry = { label: string; state: CombatState }
