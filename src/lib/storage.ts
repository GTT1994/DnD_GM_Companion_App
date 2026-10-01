// Saves app data in the browser's localStorage, so it survives a page refresh.
// localStorage is a simple key → text store, a bit like a two-column table (key, value).

import { useEffect, useReducer, useState, type Reducer } from 'react'

// All keys start with this, so they don't clash with anything else on localhost.
const PREFIX = 'gm-companion:'

// Reads a saved value, or returns the fallback if there's nothing saved (or it can't be read).
export function loadSaved<T>(key: string, fallback: T): T {
  try {
    const text = localStorage.getItem(PREFIX + key)
    return text === null ? fallback : (JSON.parse(text) as T)
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage can be full or blocked (e.g. private browsing); the app keeps working without saving.
  }
}

// Like useState, but the value is saved and restored automatically.
export function useSavedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState(() => loadSaved(key, fallback))
  useEffect(() => save(key, value), [key, value])
  return [value, setValue] as const
}

// Like useReducer, but the state is saved and restored automatically.
export function useSavedReducer<S, A>(key: string, reducer: Reducer<S, A>, fallback: S) {
  const [state, dispatch] = useReducer(reducer, fallback, (initial) => loadSaved(key, initial))
  useEffect(() => save(key, state), [key, state])
  return [state, dispatch] as const
}
