// The pages for editing one homebrew monster or spell (or creating a new one at .../new).

import { Link, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useApp } from '../lib/appContext'
import { blankMonster, blankSpell, saveMonster, saveSpell } from '../lib/homebrew'
import { MonsterEditor } from '../components/MonsterEditor'
import { SpellEditor } from '../components/SpellEditor'

export function MonsterEditorPage() {
  const { index } = useParams()
  const { edition } = useApp()
  const navigate = useNavigate()
  const isNew = index === 'new'
  // undefined while loading, null if there's no such monster.
  const existing = useLiveQuery(async () => (isNew ? null : (await db.homebrewMonsters.get(index!)) ?? null), [index])

  if (existing === undefined) return <p className="empty">Loading…</p>
  if (existing === null && !isNew) return <p className="empty">This homebrew monster doesn't exist. <Link to="/homebrew">Back to Homebrew</Link></p>

  return (
    <section className="page">
      <div className="section-header">
        <h2>{isNew ? 'New monster' : 'Edit monster'}</h2>
        <Link to="/homebrew">← Homebrew</Link>
      </div>
      <MonsterEditor
        key={index}  // start fresh when switching between monsters
        initial={existing ?? blankMonster('both')}
        appEdition={edition}
        onSave={async (monster) => {
          await saveMonster(monster)
          navigate('/homebrew')
        }}
        onCancel={() => navigate(-1)}
        onDelete={existing ? async () => {
          if (!confirm(`Delete ${existing.name}?`)) return
          await db.homebrewMonsters.delete(existing.index)
          navigate('/homebrew')
        } : undefined}
      />
    </section>
  )
}

export function SpellEditorPage() {
  const { index } = useParams()
  const navigate = useNavigate()
  const isNew = index === 'new'
  const existing = useLiveQuery(async () => (isNew ? null : (await db.homebrewSpells.get(index!)) ?? null), [index])

  if (existing === undefined) return <p className="empty">Loading…</p>
  if (existing === null && !isNew) return <p className="empty">This homebrew spell doesn't exist. <Link to="/homebrew">Back to Homebrew</Link></p>

  return (
    <section className="page">
      <div className="section-header">
        <h2>{isNew ? 'New spell' : 'Edit spell'}</h2>
        <Link to="/homebrew">← Homebrew</Link>
      </div>
      <SpellEditor
        key={index}
        initial={existing ?? blankSpell('both')}
        onSave={async (spell) => {
          await saveSpell(spell)
          navigate('/homebrew')
        }}
        onCancel={() => navigate(-1)}
        onDelete={existing ? async () => {
          if (!confirm(`Delete ${existing.name}?`)) return
          await db.homebrewSpells.delete(existing.index)
          navigate('/homebrew')
        } : undefined}
      />
    </section>
  )
}
