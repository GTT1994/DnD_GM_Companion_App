// The Generators page: a tab for each generator (NPCs, names, encounters, rumours and hooks,
// taverns, shops and loot). The last tab used is remembered, and each tab keeps its last few
// results, so they're still there after a refresh.

import type { Edition, LookupCategory } from '../types'
import { useSavedState } from '../lib/storage'
import { NpcGenerator } from './generators/NpcGenerator'
import { NameGenerator } from './generators/NameGenerator'
import { EncounterGenerator } from './generators/EncounterGenerator'
import { RumourGenerator } from './generators/RumourGenerator'
import { TavernGenerator } from './generators/TavernGenerator'
import { ShopGenerator } from './generators/ShopGenerator'
import { LootGenerator } from './generators/LootGenerator'

const TABS = {
  npc: 'NPC',
  names: 'Names',
  encounter: 'Encounter',
  rumours: 'Rumours & hooks',
  tavern: 'Tavern',
  shop: 'Shop',
  loot: 'Loot',
} as const

type Tab = keyof typeof TABS

type GeneratorsProps = {
  edition: Edition
  onOpen: (category: LookupCategory, index: string) => void  // opens an item in Quick Lookup
}

export function Generators({ edition, onOpen }: GeneratorsProps) {
  const [tab, setTab] = useSavedState<Tab>('generator-tab', 'npc')
  return (
    <section className="page generators">
      <div className="generator-tabs" role="tablist" aria-label="Generators">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>
            {TABS[t]}
          </button>
        ))}
      </div>
      {tab === 'npc' && <NpcGenerator />}
      {tab === 'names' && <NameGenerator />}
      {tab === 'encounter' && <EncounterGenerator edition={edition} />}
      {tab === 'rumours' && <RumourGenerator />}
      {tab === 'tavern' && <TavernGenerator />}
      {tab === 'shop' && <ShopGenerator edition={edition} onOpen={onOpen} />}
      {tab === 'loot' && <LootGenerator edition={edition} onOpenItem={(index) => onOpen('magic-items', index)} />}
    </section>
  )
}
