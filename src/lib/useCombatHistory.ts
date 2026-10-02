// Undo and Redo for a combat tracker page. Every named change (see combatHistory.ts) keeps a copy
// of the fight from just before it, up to the last 20; Undo puts that copy back, Redo re-applies.
// The history lasts while the page is open. ⌘Z / ⇧⌘Z work when you're not typing in a box.

import { useEffect, useRef, useState } from 'react'
import type { CombatAction } from './combat'
import { describeAction, HISTORY_LENGTH, type HistoryEntry } from './combatHistory'
import { applyCombatAction } from './store'

export function useCombatHistory(combatId: string) {
  const [past, setPast] = useState<HistoryEntry[]>([])
  const [future, setFuture] = useState<HistoryEntry[]>([])
  const busy = useRef(false)  // ignores a second Undo pressed before the first has finished

  async function dispatch(action: CombatAction) {
    const before = await applyCombatAction(combatId, action)
    const label = describeAction(action, before)
    if (!label) return
    setPast((p) => [...p, { label, state: before }].slice(-HISTORY_LENGTH))
    setFuture([])  // a new change replaces anything that could be redone
  }

  // Moves one step: takes the newest entry from one list, puts it back, and records the
  // state it replaced on the other list.
  async function step(from: HistoryEntry[], setFrom: typeof setPast, setTo: typeof setPast, verb: string) {
    const entry = from[from.length - 1]
    if (!entry || busy.current) return
    busy.current = true
    try {
      setFrom((list) => list.slice(0, -1))
      const replaced = await applyCombatAction(combatId, { type: 'restore', state: entry.state, note: `${verb}: ${entry.label}` })
      setTo((list) => [...list, { label: entry.label, state: replaced }])
    } finally {
      busy.current = false
    }
  }

  const undo = () => step(past, setPast, setFuture, 'Undid')
  const redo = () => step(future, setFuture, setPast, 'Redid')

  // ⌘Z / Ctrl+Z to undo, with Shift to redo, unless the cursor is in a box (where it undoes typing).
  const keys = useRef({ undo, redo })
  useEffect(() => {
    keys.current = { undo, redo }
  })
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      if (e.shiftKey) keys.current.redo()
      else keys.current.undo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return {
    dispatch,
    undo,
    redo,
    undoLabel: past[past.length - 1]?.label,
    redoLabel: future[future.length - 1]?.label,
  }
}
