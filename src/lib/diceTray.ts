// Lets any page roll dice in the dice tray (e.g. clicking "8d6" in a spell's text), through
// React context provided by the DiceTray component around every page.

import { createContext, useContext } from 'react'

export type DiceTrayValue = {
  // Rolls the dice, opens the tray and puts the result at the top of its history.
  roll: (expression: string, label?: string) => void
}

export const DiceTrayContext = createContext<DiceTrayValue | null>(null)

// The tray, or null outside it (then dice in text stay plain text).
export const useDiceTray = () => useContext(DiceTrayContext)

export const DICE_HISTORY = 20  // rolls kept in the tray's history
