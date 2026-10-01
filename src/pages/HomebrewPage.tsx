// The Homebrew page: the GM's own monsters and spells, shared across every campaign.
// Create, edit, duplicate, delete, and export/import them as a file.

import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type HomebrewEdition } from '../db'
import { describeImport, downloadBackup, exportHomebrew, importCampaigns } from '../lib/backup'
import { duplicateMonster, duplicateSpell } from '../lib/homebrew'
import { formatCr } from '../lib/dice'

const EDITION_LABELS: Record<HomebrewEdition, string> = { 2014: '2014', 2024: '2024', both: 'Both' }

export function HomebrewPage() {
  const monsters = useLiveQuery(() => db.homebrewMonsters.orderBy('name').toArray())
  const spells = useLiveQuery(() => db.homebrewSpells.orderBy('name').toArray())
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  // Filter both lists by the search box, like WHERE name LIKE '%' + @query + '%'.
  const matches = (name: string) => name.toLowerCase().includes(query.trim().toLowerCase())

  return (
    <section className="page">
      <div className="section-header">
        <h2>Homebrew</h2>
        <input type="search" className="search homebrew-search" placeholder="Search homebrew…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <HomebrewBackup hasEntries={(monsters?.length ?? 0) + (spells?.length ?? 0) > 0} />
      </div>
      <p className="meta">
        Your own monsters and spells, available in every campaign. They appear in Quick Lookup and the combat tracker for their edition.
        To start from an existing monster or spell, open it in Quick Lookup and press <strong>Make homebrew copy</strong>.
      </p>

      <div className="homebrew-lists">
        <div className="card">
          <div className="section-header">
            <h3>Monsters</h3>
            <Link to="/homebrew/monster/new" className="button primary">+ New monster</Link>
          </div>
          {monsters?.length === 0 && <p className="meta">No homebrew monsters yet.</p>}
          <table className="data-table">
            <tbody>
              {monsters?.filter((m) => matches(m.name)).map((m) => (
                <tr key={m.index}>
                  <td className="name-cell"><Link to={`/homebrew/monster/${m.index}`}>{m.name || 'Unnamed'}</Link></td>
                  <td className="meta">CR {formatCr(m.cr)} · {m.meta.split(', ')[1]}</td>
                  <td><span className="tag">{EDITION_LABELS[m.edition]}</span></td>
                  <td className="actions-cell">
                    <button type="button" className="small" onClick={async () => navigate(`/homebrew/monster/${await duplicateMonster(m)}`)}>Duplicate</button>
                    <button type="button" className="small danger" onClick={() => confirm(`Delete ${m.name}?`) && db.homebrewMonsters.delete(m.index)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="section-header">
            <h3>Spells</h3>
            <Link to="/homebrew/spell/new" className="button primary">+ New spell</Link>
          </div>
          {spells?.length === 0 && <p className="meta">No homebrew spells yet.</p>}
          <table className="data-table">
            <tbody>
              {spells?.filter((s) => matches(s.name)).map((s) => (
                <tr key={s.index}>
                  <td className="name-cell"><Link to={`/homebrew/spell/${s.index}`}>{s.name || 'Unnamed'}</Link></td>
                  <td className="meta">{s.level === 0 ? 'Cantrip' : `Level ${s.level}`} · {s.school}</td>
                  <td><span className="tag">{EDITION_LABELS[s.edition]}</span></td>
                  <td className="actions-cell">
                    <button type="button" className="small" onClick={async () => navigate(`/homebrew/spell/${await duplicateSpell(s)}`)}>Duplicate</button>
                    <button type="button" className="small danger" onClick={() => confirm(`Delete ${s.name}?`) && db.homebrewSpells.delete(s.index)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// Export the homebrew library to a file, or import one (as copies).
function HomebrewBackup({ hasEntries }: { hasEntries: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  async function importFile(file: File) {
    try {
      const result = await importCampaigns(JSON.parse(await file.text()))
      setMessage({ text: `Imported ${describeImport(result)}.` })
    } catch (e) {
      setMessage({ text: e instanceof SyntaxError ? 'That file is not valid JSON.' : (e as Error).message, error: true })
    }
  }

  return (
    <div className="toolbar-buttons">
      {message && <span className={message.error ? 'error' : 'notice'}>{message.text}</span>}
      <button type="button" disabled={!hasEntries} onClick={async () => downloadBackup(await exportHomebrew(), 'gm-companion-homebrew')}>Export</button>
      <button type="button" onClick={() => fileInput.current?.click()}>Import…</button>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) importFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
