// Saves a value half a second after the last change (rather than on every key press), and
// straight away if the page is left before then. Like the NPC and encounter editors, as a hook.

import { useEffect, useRef, useState } from 'react'

export function useAutosave<T>(save: (value: T) => Promise<unknown>) {
  const [pending, setPending] = useState<{ value: T } | null>(null)
  const latest = useRef<{ value: T } | null>(null)  // the unsaved value, for saving when leaving
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(async () => {
      latest.current = null
      await saveRef.current(pending.value)
      setPending((p) => (p === pending ? null : p))  // unless another change came in meanwhile
    }, 500)
    return () => clearTimeout(timer)
  }, [pending])

  // Leaving the page: save anything still waiting.
  useEffect(() => () => {
    if (latest.current) saveRef.current(latest.current.value)
  }, [])

  return {
    saved: pending === null,
    change(value: T) {
      const next = { value }
      latest.current = next
      setPending(next)
    },
    // Drops a waiting save, e.g. when the value is being replaced and saved another way.
    cancel() {
      latest.current = null
      setPending(null)
    },
  }
}
