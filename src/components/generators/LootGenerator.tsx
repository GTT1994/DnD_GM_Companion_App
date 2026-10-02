// The Loot tab: coins, gems and SRD magic items for an individual or a hoard, by challenge rating.
// Magic items open in Quick Lookup.

import { useState } from 'react'
import type { Edition } from '../../types'
import { useSrd } from '../../data/srd'
import { generateLoot, tierLabels, type Loot, type LootKind, type Tier } from '../../lib/generators'
import { useSavedState } from '../../lib/storage'
import { HISTORY } from './shared'

export function LootGenerator({ edition, onOpenItem }: { edition: Edition; onOpenItem: (index: string) => void }) {
  const [tier, setTier] = useState<Tier>(1)
  const [kind, setKind] = useState<LootKind>('hoard')
  const [loot, setLoot] = useSavedState<Loot[]>('loot', [])
  const magicItems = useSrd(edition, 'magic-items')

  return (
    <div className="generator">
      <div className="generator-controls">
        <select value={tier} onChange={(e) => setTier(Number(e.target.value) as Tier)} aria-label="Challenge rating">
          {Object.entries(tierLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as LootKind)} aria-label="Type of treasure">
          <option value="hoard">Hoard</option>
          <option value="individual">Individual</option>
        </select>
        <button
          type="button"
          className="primary"
          disabled={!magicItems}  // wait for the magic item list to load
          onClick={() => magicItems && setLoot([generateLoot(tier, kind, magicItems), ...loot].slice(0, HISTORY))}
        >
          Generate loot
        </button>
        {loot.length > 0 && <button type="button" onClick={() => setLoot([])}>Clear</button>}
      </div>
      <p className="meta">Simplified treasure tables, not the official DMG ones. Magic items come from the {edition} SRD.</p>
      {loot.map((l) => (
        <article key={l.id} className="card">
          <h3>{l.label}</h3>
          <ul>
            <li><strong>{l.gold.toLocaleString()} gp</strong></li>
            {l.gems.map((g) => (
              <li key={g.name}>{g.count > 1 ? `${g.count} × ` : ''}{g.name} ({g.value.toLocaleString()} gp each)</li>
            ))}
            {l.items.map((item) => (
              <li key={item.index}>
                {item.count > 1 ? `${item.count} × ` : ''}
                <button type="button" className="link" onClick={() => onOpenItem(item.index)}>{item.name}</button>
                <span className="meta"> · {item.rarity}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}
