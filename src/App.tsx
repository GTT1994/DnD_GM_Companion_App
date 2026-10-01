// The main app component: the page addresses (routes), the shared settings, and the
// layout around every page (header with navigation and edition switch, and footer).

import { useEffect, useRef } from 'react'
import { BrowserRouter, Link, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Edition, LookupState } from './types'
import { db, QUICK_COMBAT } from './db'
import { AppContext, useApp, useCampaignRoute } from './lib/appContext'
import { useSavedState } from './lib/storage'
import { migrateLegacyStorage } from './lib/store'
import { Home } from './pages/Home'
import { CampaignLayout } from './pages/CampaignLayout'
import { Overview } from './pages/Overview'
import { CombatPage } from './pages/CombatPage'
import { LookupPage } from './pages/LookupPage'
import { GeneratorsPage } from './pages/GeneratorsPage'
import { NpcsPage } from './pages/NpcsPage'
import { NotesPage } from './pages/NotesPage'

function App() {
  // Small preferences stay in localStorage; campaign data lives in the database.
  const [edition, setEdition] = useSavedState<Edition>('edition', '2024')
  const [lookup, setLookup] = useSavedState<LookupState>('lookup', { category: 'monsters', query: '', selected: null })
  const searchRef = useRef<HTMLInputElement>(null)

  // Move data saved by the older version of the app into the database (only does anything once).
  useEffect(() => {
    migrateLegacyStorage()
  }, [])

  return (
    <AppContext.Provider value={{ edition, setEdition, lookup, setLookup, searchRef }}>
      <BrowserRouter>
        {/* Each Route maps a page address to the page shown there */}
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="quick-combat" element={<CombatPage combatId={QUICK_COMBAT} />} />
            <Route path="lookup" element={<LookupPage />} />
            <Route path="generators" element={<GeneratorsPage />} />
            <Route path="campaign/:campaignId" element={<CampaignLayout />}>
              <Route index element={<Overview />} />
              <Route path="combat" element={<CampaignCombat />} />
              <Route path="npcs" element={<NpcsPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="lookup" element={<LookupPage />} />
              <Route path="generators" element={<GeneratorsPage />} />
            </Route>
            <Route path="*" element={<p className="empty">Page not found. <Link to="/">Go home</Link></p>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  )
}

// The campaign's own fight; its combat id is the campaign id.
function CampaignCombat() {
  const { campaignId } = useCampaignRoute()
  return <CombatPage combatId={campaignId!} campaignId={campaignId} />
}

// The header and footer around every page. The navigation changes inside a campaign.
function Layout() {
  const { edition, setEdition, searchRef } = useApp()
  const { campaignId, base } = useCampaignRoute()
  const campaign = useLiveQuery(() => (campaignId ? db.campaigns.get(campaignId) : undefined), [campaignId])
  const navigate = useNavigate()

  // ⌘K (or Ctrl+K) jumps to Quick Lookup and puts the cursor in the search box from anywhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        navigate(`${base}/lookup`)
        // Wait a moment for the Lookup page to appear before focusing.
        setTimeout(() => searchRef.current?.select())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, base, searchRef])

  const links = campaignId
    ? [
        { to: base, label: 'Overview', end: true },
        { to: `${base}/combat`, label: 'Combat' },
        { to: `${base}/npcs`, label: 'NPCs' },
        { to: `${base}/notes`, label: 'Notes' },
        { to: `${base}/lookup`, label: 'Quick Lookup' },
        { to: `${base}/generators`, label: 'Generators' },
      ]
    : [
        { to: '/', label: 'Home', end: true },
        { to: '/quick-combat', label: 'Quick combat' },
        { to: '/lookup', label: 'Quick Lookup' },
        { to: '/generators', label: 'Generators' },
      ]

  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="app-title" title="Home">GM Companion</Link>
        {campaign && <span className="campaign-name">{campaign.name}</span>}
        <nav className="page-tabs">
          {/* NavLink knows when its page is open, and gets the "selected" style */}
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'selected' : '')}>
              {l.label}
            </NavLink>
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
        <Outlet />  {/* the current page goes here */}
      </main>

      <footer className="app-footer">
        Rules content from the System Reference Document 5.1 and 5.2 by Wizards of the Coast LLC, licensed under CC-BY-4.0.
        Data via <a href="https://github.com/5e-bits/5e-database" target="_blank" rel="noreferrer">5e-database</a>.
      </footer>
    </div>
  )
}

export default App
