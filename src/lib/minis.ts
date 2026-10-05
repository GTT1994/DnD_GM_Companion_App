// Mini labels: which miniature on the physical map is which monster, e.g. Guard 2 = "with shield"
// on a blue base. Typed in by the GM in the combat tracker; shown with the name in the tracker,
// the turn line, target lists, notices and the roll log.

import type { Combatant, MiniColour, MiniLabel } from '../types'

// The colour dots to pick from, with the colour each is drawn in.
export const MINI_COLOURS: Record<MiniColour, string> = {
  red: '#d9534f',
  orange: '#e8892f',
  yellow: '#e6c84a',
  green: '#5fa04e',
  blue: '#4a86d9',
  purple: '#9b6ad6',
  black: '#1b1b1b',
  white: '#f2f2f2',
}

// The label as words: its text ("with shield"), or the colour ("red") when there's no text.
export function miniText(mini: MiniLabel | undefined): string {
  if (!mini) return ''
  return mini.text.trim() || mini.colour || ''
}

// A combatant's name with its mini label, for lists and the log: "Guard 2 (with shield)".
export function displayName(c: Pick<Combatant, 'name' | 'mini'>): string {
  const text = miniText(c.mini)
  return text ? `${c.name} (${text})` : c.name
}

// Tidies a label from the form: blank text and no colour means no label.
export function cleanMini(text: string, colour: MiniColour | undefined): MiniLabel | null {
  const trimmed = text.trim()
  if (!trimmed && !colour) return null
  return colour ? { text: trimmed, colour } : { text: trimmed }
}
