// Tests for the rumour, hook, tavern, shop and random encounter generators, and adding their
// results to the session plan.

import { describe, expect, it } from 'vitest'
import { loadSrd } from '../data/srd'
import { MONSTERS_BY_ENVIRONMENT } from '../data/environments'
import { generateHook, generateRumour, generateShop, generateTavern } from './worldGenerators'
import { DIFFICULTIES, generateEncounter } from './randomEncounter'
import { addUnderHeading, docToText, sessionTemplate } from './richText'
import { rumourNotes, tavernNotes } from './generatorNotes'
import { difficulty } from './encounters'

// A random source that steps through values, so tests can explore many outcomes.
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

describe('rumours and hooks', () => {
  it('fills in every {placeholder}', () => {
    const random = seeded(7)
    for (let i = 0; i < 50; i++) {
      const r = generateRumour(random)
      expect(r.text).not.toMatch(/[{}]/)
      expect(['true', 'partly', 'false']).toContain(r.truth)
      expect(Boolean(r.behind)).toBe(r.truth !== 'true')  // what's really going on, for the GM
      expect(Object.values(generateHook(random)).join(' ')).not.toMatch(/[{}]/)
    }
  })
})

describe('generateTavern', () => {
  it('has an innkeeper, three patrons and dishes, and two rumours', () => {
    const t = generateTavern(seeded(3))
    expect(t.name).toMatch(/^The \w+ \w+$/)
    expect(t.owner.occupation).toBe('innkeeper')
    expect(t.patrons).toHaveLength(3)
    expect(new Set(t.menu).size).toBe(3)
    expect(t.rumours).toHaveLength(2)
  })
})

describe('generateShop', () => {
  it('stocks the right kind of goods, cheaper in a village', async () => {
    const equipment = await loadSrd('2014', 'equipment')
    const items = await loadSrd('2014', 'magic-items')
    const smith = generateShop('blacksmith', 'village', equipment, items, seeded(5))
    expect(smith.keeper.occupation).toBe('blacksmith')
    expect(smith.items.length).toBeGreaterThan(0)
    for (const item of smith.items) {
      const e = equipment.find((x) => x.index === item.index)!
      expect(['Weapon', 'Armor', 'Tools']).toContain(e.category)
      expect(e.costGp!).toBeLessThanOrEqual(50)  // villages don't stock plate armour
    }
    const fletcher = generateShop('fletcher', 'city', equipment, items, seeded(9))
    expect(fletcher.items.every((i) => /bow|arrow|bolt|sling|dart|needle|quiver|bullet|blowgun/i.test(i.name))).toBe(true)
  })

  it('a magic shop sells magic items priced by rarity', async () => {
    const items = await loadSrd('2024', 'magic-items')
    const shop = generateShop('magic', 'city', [], items, seeded(11))
    expect(shop.items.length).toBeGreaterThanOrEqual(5)
    for (const item of shop.items) {
      expect(item.kind).toBe('magic')
      const gp = parseInt(item.price.replace(/\D/g, ''))
      if (item.rarity === 'Common') expect(gp).toBeLessThanOrEqual(100)
      if (item.rarity === 'Rare') expect(gp).toBeGreaterThan(500)
    }
  })
})

describe('generateEncounter', () => {
  it('builds encounters from the environment at the chosen difficulty', async () => {
    for (const edition of ['2014', '2024'] as const) {
      const monsters = await loadSrd(edition, 'monsters')
      const random = seeded(edition === '2014' ? 13 : 17)
      for (const target of DIFFICULTIES[edition]) {
        const enc = generateEncounter(edition, monsters, 'forest', target, [3, 3, 3, 3], random)!
        expect(enc.rating).toBe(target)
        expect(enc.monsters.every((m) => MONSTERS_BY_ENVIRONMENT.forest.includes(m.index))).toBe(true)
        expect(difficulty(edition, [3, 3, 3, 3], enc.monsters).rating).toBe(target)
      }
    }
  })

  it('uses a homebrew monster tagged with the environment', () => {
    const lurker = { index: 'hb-lurker', name: 'Lurker', xp: 450, cr: 2, environments: ['swamp'] } as never
    const enc = generateEncounter('2024', [lurker], 'swamp', 'Moderate', [3, 3, 3, 3], seeded(2))
    expect(enc?.monsters[0].index).toBe('hb-lurker')
    expect(generateEncounter('2024', [lurker], 'desert', 'Moderate', [3], seeded(2))).toBeNull()
  })

  it('every tagged environment has monsters in both editions', async () => {
    for (const edition of ['2014', '2024'] as const) {
      const indexes = new Set((await loadSrd(edition, 'monsters')).map((m) => m.index))
      for (const [env, list] of Object.entries(MONSTERS_BY_ENVIRONMENT)) {
        expect(list.filter((i) => indexes.has(i)).length, `${edition} ${env}`).toBeGreaterThan(5)
      }
    }
  })
})

describe('adding to the session plan', () => {
  it('puts rumours under Secrets & clues, replacing the empty template tick-box', () => {
    const rumours = [generateRumour(seeded(4))]
    const { plan } = rumourNotes(rumours)
    const doc = addUnderHeading(sessionTemplate(), plan.section, plan.blocks)
    const headings = doc.content!.map((b) => b.type === 'heading' ? docToText({ type: 'doc', content: [b] }) : b.type)
    const at = headings.indexOf('Secrets & clues')
    expect(headings[at + 1]).toBe('taskList')
    expect(headings[at + 2]).toBe('NPCs')  // nothing else added
    expect(doc.content![at + 1].content).toHaveLength(1)  // the empty one replaced
    expect(docToText(doc)).toContain(rumours[0].text)
  })

  it('adds the heading at the end when the plan has none', () => {
    const tavern = generateTavern(seeded(8))
    const { plan } = tavernNotes(tavern)
    const doc = addUnderHeading({ type: 'doc', content: [] }, plan.section, plan.blocks)
    expect(docToText(doc).startsWith(`Locations ${tavern.name}`)).toBe(true)
  })
})
