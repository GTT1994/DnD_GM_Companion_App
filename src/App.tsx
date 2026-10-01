// The main app component: the header (page tabs, edition switch) and whichever page is open.
// It owns the state that more than one page needs: the combat and Quick Lookup state.

import { useEffect, useRef } from 'react'
import type { Combatant, Edition, LookupCategory, LookupState, Page } from './types'
import type { Monster } from './data/srd'
import { combatReducer, emptyCombat, uniqueName } from './lib/combat'
import { abilityMod, rollDie } from './lib/dice'
import { useSavedReducer, useSavedState } from './lib/storage'
import { CombatTracker } from './components/CombatTracker'
import { Lookup } from './components/Lookup'
import { Generators } from './components/Generators'

const PAGES: { page: Page; label: string }[] = [
  { page: 'combat', label: 'Combat' },
  { page: 'lookup', label: 'Quick Lookup' },
  { page: 'generators', label: 'Generators' },
]

function App() {
  // All of these are saved in the browser, so a refresh doesn't lose anything.
  const [page, setPage] = useSavedState<Page>('page', 'combat')
  const [edition, setEdition] = useSavedState<Edition>('edition', '2024')
  const [combat, dispatch] = useSavedReducer('combat', combatReducer, emptyCombat)
  const [lookup, setLookup] = useSavedState<LookupState>('lookup', { category: 'monsters', query: '', selected: null })
  const searchRef = useRef<HTMLInputElement>(null)

  // ⌘K (or Ctrl+K) jumps to Quick Lookup and puts the cursor in the search box from anywhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPage('lookup')
        // Wait a moment for the Lookup page to appear before focusing.
        setTimeout(() => searchRef.current?.select())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setPage])

  // Adds SRD monsters to combat, each rolling its own initiative (d20 + Dex modifier).
  function addMonster(monster: Monster, count: number) {
    const added: Combatant[] = []
    for (let i = 0; i < count; i++) {
      added.push({
        id: crypto.randomUUID(),
        name: uniqueName(monster.name, [...combat.combatants, ...added]),
        initiative: rollDie(20) + abilityMod(monster.abilities[1]),
        hp: monster.hp,
        maxHp: monster.hp,
        tempHp: 0,
        ac: monster.ac,
        isPlayer: false,
        conditions: [],
        monster: { edition, index: monster.index },
      })
    }
    dispatch({ type: 'add', combatants: added })
  }

  // Opens a specific entry in Quick Lookup (used by the tracker and the loot generator).
  function openInLookup(category: LookupCategory, index: string) {
    setLookup({ ...lookup, category, selected: { category, index } })
    setPage('lookup')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>GM Companion</h1>
        <nav className="page-tabs">
          {PAGES.map((p) => (
            <button key={p.page} type="button" className={page === p.page ? 'selected' : ''} onClick={() => setPage(p.page)}>
              {p.label}
            </button>
          ))}
        </nav>
        {/* Switches which edition's rules data is shown */}
        <div className="edition-switch" role="group" aria-label="Rules edition">
          {(['2014', '2024'] as const).map((e) => (
            <button key={e} type="button" className={edition === e ? 'selected' : ''} onClick={() => setEdition(e)}>
              {e}
            </button>
          ))}
        </div>
      </header>

      <main>
        {page === 'combat' && (
          <CombatTracker
            combat={combat}
            dispatch={dispatch}
            edition={edition}
            onOpenMonster={(monsterEdition, index) => {
              setEdition(monsterEdition)  // show the stat block from the edition it was added from
              openInLookup('monsters', index)
            }}
          />
        )}
        {page === 'lookup' && (
          <Lookup edition={edition} state={lookup} setState={setLookup} searchRef={searchRef} onAddMonster={addMonster} />
        )}
        {page === 'generators' && <Generators edition={edition} onOpenItem={(index) => openInLookup('magic-items', index)} />}
      </main>

      <footer className="app-footer">
        Rules content from the System Reference Document 5.1 and 5.2 by Wizards of the Coast LLC, licensed under CC-BY-4.0.
        Data via <a href="https://github.com/5e-bits/5e-database" target="_blank" rel="noreferrer">5e-database</a>.
      </footer>
    </div>
  )
}

export default App
