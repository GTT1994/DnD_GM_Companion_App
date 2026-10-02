// Generators for the world around the party: rumours, plot hooks, taverns and shops. Each takes
// an optional random source so tests are predictable. Tables are in data/generatorTables.ts.

import type { Equipment, MagicItem } from '../data/srd'
import {
  ALCHEMIST_ITEMS, CREATURES, DISHES, FALSE_BECAUSE, HAGGLING, HOOK_COMPLICATIONS, HOOK_GIVERS, HOOK_GOALS, HOOK_REWARDS,
  MAGIC_PRICES, PARTLY_TRUE, PATRONS, PLACES, RUMOURS, SETTLEMENTS, SHOP_LABELS, SHOP_NAMES, SHOPKEEPER_JOBS, TAVERN_ADJECTIVES,
  TAVERN_ATMOSPHERES, TAVERN_NOUNS, TAVERN_PRICES, THINGS, type SettlementSize, type ShopType, type TavernQuality,
} from '../data/generatorTables'
import { generateNpc, randomName, type Npc } from './generators'
import { pick, pickWeighted, roll, type Random } from './dice'

// Fills in {name}, {place}, {creature} and {thing}, capitalising the first letter.
export function fillIn(template: string, random: Random = Math.random): string {
  const text = template
    .replace(/\{name\}/g, () => randomName(undefined, undefined, random).name)
    .replace(/\{place\}/g, () => pick(PLACES, random))
    .replace(/\{creature\}/g, () => pick(CREATURES, random))
    .replace(/\{thing\}/g, () => pick(THINGS, random))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Picks a few different entries from a list.
function pickSome<T>(list: readonly T[], count: number, random: Random): T[] {
  const pool = [...list]
  const result: T[] = []
  while (result.length < count && pool.length) result.push(pool.splice(Math.floor(random() * pool.length), 1)[0])
  return result
}

// --- Rumours and hooks -------------------------------------------------------------------

export type Truth = 'true' | 'partly' | 'false'
export const TRUTH_LABELS: Record<Truth, string> = { true: 'True', partly: 'Partly true', false: 'False' }

export type Rumour = { id: string; text: string; truth: Truth; behind?: string }  // behind: what's really going on (GM only)

// Half the rumours are true, a third partly true, the rest false.
export function generateRumour(random: Random = Math.random): Rumour {
  const truth = pickWeighted<Truth>({ true: 50, partly: 30, false: 20 }, random)
  const behind = truth === 'partly' ? pick(PARTLY_TRUE, random) : truth === 'false' ? pick(FALSE_BECAUSE, random) : undefined
  return { id: crypto.randomUUID(), text: fillIn(pick(RUMOURS, random), random), truth, behind }
}

export type Hook = { id: string; giver: string; goal: string; complication: string; reward: string }

export function generateHook(random: Random = Math.random): Hook {
  const giverName = randomName(undefined, undefined, random).name
  return {
    id: crypto.randomUUID(),
    giver: `${giverName}, ${pick(HOOK_GIVERS, random)}`,
    goal: fillIn(pick(HOOK_GOALS, random), random),
    complication: fillIn(pick(HOOK_COMPLICATIONS, random), random),
    reward: fillIn(pick(HOOK_REWARDS, random), random),
  }
}

// --- Taverns -----------------------------------------------------------------------------

export type Tavern = {
  id: string
  name: string
  quality: TavernQuality
  owner: Npc
  atmosphere: string
  patrons: string[]
  menu: string[]
  prices: { meal: string; room: string; drink: string }
  rumours: Rumour[]
}

export function generateTavern(random: Random = Math.random): Tavern {
  const quality = pickWeighted<TavernQuality>({ poor: 20, modest: 40, comfortable: 30, wealthy: 10 }, random)
  return {
    id: crypto.randomUUID(),
    name: `The ${pick(TAVERN_ADJECTIVES, random)} ${pick(TAVERN_NOUNS, random)}`,
    quality,
    owner: generateNpc(undefined, random, { occupation: 'innkeeper' }),
    atmosphere: pick(TAVERN_ATMOSPHERES, random),
    patrons: pickSome(PATRONS, 3, random),
    menu: pickSome(DISHES[quality], 3, random),
    prices: TAVERN_PRICES[quality],
    rumours: [generateRumour(random), generateRumour(random)],
  }
}

// --- Shops -------------------------------------------------------------------------------

export type ShopItem = { index: string; name: string; price: string; kind: 'equipment' | 'magic'; rarity?: string }

export type Shop = {
  id: string
  name: string
  type: ShopType
  size: SettlementSize
  keeper: Npc
  haggling: string
  items: ShopItem[]
}

// Which mundane items a kind of shop sells.
function sells(type: ShopType, item: Equipment): boolean {
  const name = item.name.toLowerCase()
  switch (type) {
    case 'general':
      return item.category === 'Adventuring Gear' || (item.category === 'Tools' && !/artisan/i.test(item.detail ?? ''))
    case 'blacksmith':
      return (item.category === 'Weapon' && !/ranged/i.test(item.detail ?? '')) || item.category === 'Armor' || /smith|tinker/i.test(name)
    case 'alchemist':
      return ALCHEMIST_ITEMS.some((n) => name.startsWith(n))
    case 'fletcher':
      return (item.category === 'Weapon' && /ranged/i.test(item.detail ?? '')) || item.category === 'Ammunition' || /quiver|arrow|bolt/i.test(name)
    case 'magic':
      return false
  }
}

// A price rolled within the rarity's band, rounded to a tidy number.
function magicPrice(rarity: string, random: Random): number {
  const [low, high] = MAGIC_PRICES[rarity] ?? MAGIC_PRICES.Common
  const raw = low + random() * (high - low)
  const step = raw >= 5000 ? 500 : raw >= 500 ? 50 : 10
  return Math.max(low, Math.round(raw / step) * step)
}

// A shop with stock to suit its type and the size of the settlement. Mundane prices are the SRD
// list prices; small places only stock cheaper items. Magic shops (and a few potions at the
// alchemist in towns and cities) draw from the SRD magic items.
export function generateShop(type: ShopType, size: SettlementSize, equipment: Equipment[], magicItems: MagicItem[], random: Random = Math.random): Shop {
  const settlement = SETTLEMENTS[size]
  const keeper = generateNpc(undefined, random, { occupation: SHOPKEEPER_JOBS[type] })
  const items: ShopItem[] = []

  if (type !== 'magic') {
    const stock = equipment.filter((e) => sells(type, e) && (e.costGp ?? 0) <= settlement.maxPrice)
    for (const e of pickSome(stock, settlement.stock, random)) {
      items.push({ index: e.index, name: e.name, price: e.cost ?? '—', kind: 'equipment' })
    }
  }

  const magicCount = type === 'magic' ? roll(settlement.magicCount, random).total : type === 'alchemist' && size !== 'village' ? 2 : 0
  const potionsOnly = type === 'alchemist'
  for (let i = 0; i < magicCount; i++) {
    const rarity = pickWeighted(settlement.magic, random)
    const pool = magicItems.filter((m) => m.rarity === rarity && (!potionsOnly || /potion|oil|elixir/i.test(m.name)))
    if (!pool.length) continue
    const item = pick(pool, random)
    if (items.some((x) => x.index === item.index)) continue
    items.push({ index: item.index, name: item.name, price: `${magicPrice(rarity, random).toLocaleString()} gp`, kind: 'magic', rarity })
  }

  const owner = keeper.name.split(' ')[0]
  const name = random() < 0.5 ? `${owner}'s ${pick(SHOP_NAMES[type], random)}` : `The ${pick(TAVERN_ADJECTIVES, random)} ${pick(SHOP_NAMES[type], random)}`
  return {
    id: crypto.randomUUID(),
    name,
    type,
    size,
    keeper,
    haggling: pick(HAGGLING, random),
    items: items.sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export const shopLabel = (shop: Shop) => `${SHOP_LABELS[shop.type]} · ${shop.size}`
