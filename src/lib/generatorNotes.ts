// Turns generated rumours, hooks, taverns and shops into formatted text for the session plan
// (under the right heading of the template) or the campaign notes.

import type { JSONContent } from '@tiptap/core'
import { bulletList, heading, taskList } from './richText'
import { shopLabel, TRUTH_LABELS, type Hook, type Rumour, type Shop, type Tavern } from './worldGenerators'
import type { Npc } from './generators'

export type Saveable = {
  plan: { section: string; blocks: JSONContent[] }  // section = the plan heading it goes under
  notes: JSONContent[]
}

// e.g. "Rumour (partly true): Lights at the old mill… (really: it happened years ago)".
const rumourLine = (r: Rumour) => `Rumour (${TRUTH_LABELS[r.truth].toLowerCase()}): ${r.text}${r.behind ? ` (really: ${r.behind})` : ''}`
const npcLine = (role: string, npc: Npc) => `${role}: ${npc.name}, ${npc.ancestry} ${npc.gender.toLowerCase()}, ${npc.personality}; ${npc.mannerism}`

export function rumourNotes(rumours: Rumour[]): Saveable {
  return {
    plan: { section: 'Secrets & clues', blocks: [taskList(rumours.map(rumourLine))] },
    notes: [heading('Rumours', 3), bulletList(rumours.map(rumourLine))],
  }
}

export function hookNotes(hook: Hook): Saveable {
  const lines = [`Given by ${hook.giver}`, `Complication: ${hook.complication}`, `Reward: ${hook.reward}`]
  return {
    plan: { section: 'Scenes', blocks: [taskList([`${hook.goal} (${lines.join('; ')})`])] },
    notes: [heading(`Hook: ${hook.goal}`, 3), bulletList(lines)],
  }
}

export function tavernNotes(t: Tavern): Saveable {
  const blocks = [
    heading(t.name, 3),
    bulletList([
      npcLine('Owner', t.owner),
      `Atmosphere: ${t.atmosphere}`,
      `Patrons: ${t.patrons.join('; ')}`,
      `Menu (${t.quality}): ${t.menu.join(', ')}. Meal ${t.prices.meal}, room ${t.prices.room}. ${t.prices.drink}`,
      ...t.rumours.map(rumourLine),
    ]),
  ]
  return { plan: { section: 'Locations', blocks }, notes: blocks }
}

export function shopNotes(s: Shop): Saveable {
  const blocks = [
    heading(`${s.name} (${shopLabel(s)})`, 3),
    bulletList([
      npcLine('Shopkeeper', s.keeper),
      `Haggling: ${s.haggling}`,
      `Stock: ${s.items.map((i) => `${i.name} ${i.price}`).join(', ') || 'nothing much'}`,
    ]),
  ]
  return { plan: { section: 'Locations', blocks }, notes: blocks }
}
