// The dice roller on every page: a 🎲 button in the bottom-right corner (or the D key) opens a
// tray to type rolls like "3d6+2", "d20 adv" or "4d6kh3", build them from quick dice buttons,
// save favourites, and see the last few rolls. History and favourites are kept in this browser.
// Wraps the pages so they can roll in it too (dice in spell and rules text).

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { addDice, parseDice } from '../lib/dice'
import { parseRoll, rollExpression, type DiceRoll, type RolledTerm } from '../lib/diceRoller'
import { DICE_HISTORY, DiceTrayContext } from '../lib/diceTray'
import { useSavedState } from '../lib/storage'

type Favourite = { id: string; name: string; expression: string }

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100]

// True when the key press is going into a text box (so D should type a "d", not open the tray).
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
}

export function DiceTray({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [justRolled, setJustRolled] = useState(false)  // the next quick die starts a new roll
  const [error, setError] = useState('')
  const [naming, setNaming] = useState<string | null>(null)  // the favourite's name while saving one
  const [history, setHistory] = useSavedState<DiceRoll[]>('dice-history', [])
  const [favourites, setFavourites] = useSavedState<Favourite[]>('dice-favourites', [])
  const trayRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Rolls and adds the result to the top of the history. Returns an error message, or ''.
  const rollText = useCallback((expression: string, label?: string) => {
    const result = rollExpression(expression, label)
    if (typeof result === 'string') return result
    setHistory((h) => [result, ...h].slice(0, DICE_HISTORY))
    return ''
  }, [setHistory])

  const openTray = useCallback(() => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus())  // after the tray appears
  }, [])

  // D opens the tray (unless typing in a box); Esc closes it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault()
        openTray()
      } else if (e.key === 'Escape' && (trayRef.current?.contains(document.activeElement) || document.activeElement === document.body)) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openTray])

  // Pages roll through this: the tray opens with the result at the top.
  const tray = useMemo(() => ({
    roll: (expression: string, label?: string) => {
      rollText(expression, label)
      setOpen(true)
    },
  }), [rollText])

  function submit() {
    if (!text.trim()) return
    const problem = rollText(text)
    setError(problem)
    setJustRolled(!problem)
  }

  // Quick dice add to the roll being built: d6, d6, d8 → "2d6+1d8".
  function addDie(sides: number) {
    const current = justRolled ? '' : text.trim()
    const die = `1d${sides}`
    setText(!current ? die : parseDice(current) ? addDice(current, die) : `${current}+${die}`)
    setJustRolled(false)
    setError('')
    inputRef.current?.focus()
  }

  function saveFavourite() {
    if (!naming?.trim()) return
    setFavourites([...favourites, { id: crypto.randomUUID(), name: naming.trim(), expression: text.trim() }])
    setNaming(null)
  }

  return (
    <DiceTrayContext.Provider value={tray}>
      {children}

      {open && (
        <div className="dice-tray" role="dialog" aria-label="Dice roller" ref={trayRef}>
          <header>
            <h2>Dice</h2>
            <button type="button" className="icon-button" aria-label="Close dice roller" onClick={() => setOpen(false)}>✕</button>
          </header>

          <form className="dice-input" onSubmit={(e) => { e.preventDefault(); submit() }}>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => { setText(e.target.value); setJustRolled(false); setError('') }}
              placeholder="3d6+2, d20 adv, 4d6kh3"
              aria-label="Dice to roll"
            />
            <button type="submit" className="primary">Roll</button>
            <button type="button" aria-label="Save as favourite" title="Save as favourite" disabled={!text.trim() || typeof parseRoll(text) === 'string'} onClick={() => setNaming(text.trim())}>★</button>
          </form>
          {error && <p className="dice-error">{error}</p>}

          {naming !== null && (
            <form className="dice-input" onSubmit={(e) => { e.preventDefault(); saveFavourite() }}>
              <input value={naming} onChange={(e) => setNaming(e.target.value)} aria-label="Favourite name" autoFocus />
              <button type="submit" className="small">Save</button>
              <button type="button" className="small" onClick={() => setNaming(null)}>Cancel</button>
            </form>
          )}

          <div className="quick-dice">
            {QUICK_DICE.map((sides) => (
              <button key={sides} type="button" className="small" onClick={() => addDie(sides)}>d{sides}</button>
            ))}
          </div>

          {favourites.length > 0 && (
            <div className="dice-favourites">
              {favourites.map((f) => (
                <span key={f.id} className="dice-favourite">
                  <button type="button" className="small" title={f.expression} onClick={() => rollText(f.expression, f.name)}>{f.name}</button>
                  <button type="button" className="icon-button" aria-label={`Remove ${f.name}`} onClick={() => setFavourites(favourites.filter((x) => x.id !== f.id))}>✕</button>
                </span>
              ))}
            </div>
          )}

          {history.length > 0 ? (
            <>
              <ol className="dice-history">
                {history.map((r) => (
                  <li key={r.id} className="dice-roll">
                    <div className="dice-roll-head">
                      <span className="dice-what">{r.label && <strong>{r.label}: </strong>}{r.expression}</span>
                      <span className="dice-total">{r.total}</span>
                      <button type="button" className="icon-button" aria-label="Roll again" title="Roll again" onClick={() => rollText(r.expression, r.label)}>↻</button>
                    </div>
                    <div className="dice-faces">{r.terms.map((t, i) => <Term key={i} term={t} first={i === 0} />)}</div>
                  </li>
                ))}
              </ol>
              <button type="button" className="small" onClick={() => setHistory([])}>Clear history</button>
            </>
          ) : (
            <p className="meta">Rolls show here. Press D on any page to open this.</p>
          )}
        </div>
      )}

      <button type="button" className="dice-fab" aria-label="Dice roller" title="Dice roller (D)" aria-expanded={open} onClick={() => (open ? setOpen(false) : openTray())}>🎲</button>
    </DiceTrayContext.Provider>
  )
}

// One part of a roll: each die (dropped ones struck through, natural 20s and 1s highlighted) or a number.
function Term({ term, first }: { term: RolledTerm; first: boolean }) {
  const sign = term.sign < 0 ? '−' : first ? '' : '+'
  if (term.flat !== undefined) return <span className="dice-flat">{sign}{term.flat}</span>
  return (
    <span className="dice-term">
      {sign && <span className="dice-sign">{sign}</span>}
      {term.dice!.map((d, i) => {
        const nat = d.sides === 20 && d.kept ? (d.value === 20 ? ' nat20' : d.value === 1 ? ' nat1' : '') : ''
        return <span key={i} className={`die${d.kept ? '' : ' dropped'}${nat}`} title={`d${d.sides}`}>{d.value}</span>
      })}
    </span>
  )
}
