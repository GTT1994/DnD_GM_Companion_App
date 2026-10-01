// The Generators page: random NPCs and random loot. The last few results of each
// are saved, so they're still there after a refresh.

import { useState } from 'react'
import type { Edition } from '../types'
import { useSrd } from '../data/srd'
import { ancestries, type Ancestry } from '../data/npcTables'
import { generateLoot, generateNpc, tierLabels, type Loot, type LootKind, type Npc, type Tier } from '../lib/generators'
import { useSavedState } from '../lib/storage'

const HISTORY = 8  // how many past results to keep

type GeneratorsProps = {
  edition: Edition
  onOpenItem: (index: string) => void  // opens a magic item in Quick Lookup
}

export function Generators({ edition, onOpenItem }: GeneratorsProps) {
  return (
    <section className="page generators">
      <NpcGenerator />
      <LootGenerator edition={edition} onOpenItem={onOpenItem} />
    </section>
  )
}

function NpcGenerator() {
  const [ancestry, setAncestry] = useState<Ancestry | ''>('')  // '' = any
  const [npcs, setNpcs] = useSavedState<Npc[]>('npcs', [])

  return (
    <div className="generator">
      <h2>NPC</h2>
      <div className="generator-controls">
        <select value={ancestry} onChange={(e) => setAncestry(e.target.value as Ancestry | '')} aria-label="Ancestry">
          <option value="">Any ancestry</option>
          {Object.keys(ancestries).map((a) => <option key={a}>{a}</option>)}
        </select>
        {/* Newest first, keeping only the last few */}
        <button type="button" className="primary" onClick={() => setNpcs([generateNpc(ancestry || undefined), ...npcs].slice(0, HISTORY))}>
          Generate NPC
        </button>
        {npcs.length > 0 && <button type="button" onClick={() => setNpcs([])}>Clear</button>}
      </div>
      {npcs.map((npc) => (
        <article key={npc.id} className="card">
          <h3>{npc.name}</h3>
          <p className="meta">{npc.ancestry} {npc.occupation}</p>
          <ul>
            <li><strong>Looks:</strong> {npc.appearance}</li>
            <li><strong>Personality:</strong> {npc.personality}</li>
            <li><strong>Mannerism:</strong> {npc.mannerism}</li>
            <li><strong>Wants to:</strong> {npc.motivation}</li>
            <li><strong>Secret:</strong> {npc.secret}</li>
          </ul>
        </article>
      ))}
    </div>
  )
}

function LootGenerator({ edition, onOpenItem }: GeneratorsProps) {
  const [tier, setTier] = useState<Tier>(1)
  const [kind, setKind] = useState<LootKind>('hoard')
  const [loot, setLoot] = useSavedState<Loot[]>('loot', [])
  const magicItems = useSrd(edition, 'magic-items')

  return (
    <div className="generator">
      <h2>Loot</h2>
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
