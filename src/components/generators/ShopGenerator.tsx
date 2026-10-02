// The Shop tab: a shop of the chosen type in a village, town or city, with a shopkeeper (who can
// be saved as an NPC), how they haggle, and stock with prices: SRD equipment at list price, and SRD
// magic items priced by rarity. Item names open in Quick Lookup.

import { useState } from 'react'
import type { Edition, LookupCategory } from '../../types'
import { useSrd } from '../../data/srd'
import { SHOP_LABELS, type SettlementSize, type ShopType } from '../../data/generatorTables'
import { generateShop, shopLabel, type Shop } from '../../lib/worldGenerators'
import { shopNotes } from '../../lib/generatorNotes'
import { useSavedState } from '../../lib/storage'
import { SaveNpcButton, SaveToCampaign } from './SaveButtons'
import { HISTORY } from './shared'

type ShopGeneratorProps = {
  edition: Edition
  onOpen: (category: LookupCategory, index: string) => void
}

export function ShopGenerator({ edition, onOpen }: ShopGeneratorProps) {
  const equipment = useSrd(edition, 'equipment')
  const magicItems = useSrd(edition, 'magic-items')
  const [type, setType] = useState<ShopType>('general')
  const [size, setSize] = useSavedState<SettlementSize>('shop-size', 'town')
  const [shops, setShops] = useSavedState<Shop[]>('shops', [])

  return (
    <div className="generator">
      <div className="generator-controls">
        <select value={type} onChange={(e) => setType(e.target.value as ShopType)} aria-label="Shop type">
          {Object.entries(SHOP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={size} onChange={(e) => setSize(e.target.value as SettlementSize)} aria-label="Settlement size">
          <option value="village">Village</option>
          <option value="town">Town</option>
          <option value="city">City</option>
        </select>
        <button
          type="button"
          className="primary"
          disabled={!equipment || !magicItems}  // wait for the item lists to load
          onClick={() => setShops([generateShop(type, size, equipment!, magicItems!), ...shops].slice(0, HISTORY))}
        >
          Generate shop
        </button>
        {shops.length > 0 && <button type="button" onClick={() => setShops([])}>Clear</button>}
      </div>
      <p className="meta">Equipment at SRD list prices. Magic item prices are rough bands by rarity (the SRD doesn't price them).</p>
      <div className="generator-results">
        {shops.map((s) => (
          <article key={s.id} className="card shop-card">
            <h3>{s.name}</h3>
            <p className="meta">{shopLabel(s)}</p>
            <ul>
              <li>
                <strong>Shopkeeper:</strong> {s.keeper.name}, {s.keeper.ancestry} ({s.keeper.gender.toLowerCase()}), {s.keeper.personality}{' '}
                <SaveNpcButton npc={s.keeper} label="Save as NPC" />
              </li>
              <li><strong>Haggling:</strong> {s.haggling}</li>
            </ul>
            {s.items.length === 0 ? <p className="meta">Nothing in stock today.</p> : (
              <table className="shop-stock">
                <tbody>
                  {s.items.map((item) => (
                    <tr key={item.index}>
                      <td>
                        <button type="button" className="link" onClick={() => onOpen(item.kind === 'magic' ? 'magic-items' : 'equipment', item.index)}>{item.name}</button>
                        {item.rarity && <span className="meta"> · {item.rarity}</span>}
                      </td>
                      <td className="shop-price">{item.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="card-actions"><SaveToCampaign saveable={shopNotes(s)} /></div>
          </article>
        ))}
      </div>
    </div>
  )
}
