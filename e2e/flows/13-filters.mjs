// Monster and spell filters: CR, type, damage immunity and sort in Quick Lookup, spell class,
// casting time and save filters, Clear filters, and the same monster filters in the encounter builder.

import { assert, createCampaign, select } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  await page.goto(`${base}/lookup`)
  await page.getByRole('button', { name: '2014', exact: true }).click()
  await page.getByRole('button', { name: 'Monsters', exact: true }).click()
  await page.locator('.results button').first().waitFor()
  const names = () => page.locator('.results .result-name').allInnerTexts()
  const subtitles = () => page.locator('.results .result-subtitle').allInnerTexts()

  // Dragons of CR 10+ that are immune to fire: the red, gold and brass ones.
  await page.getByRole('button', { name: /^Filters/ }).click()
  const bar = page.locator('.filter-grid')
  await select(bar, 'Type').selectOption('dragon')
  await select(bar, 'Min CR').selectOption('10')
  await select(bar, 'Damage type').selectOption('fire')
  await select(bar, 'Defence').selectOption('immune')
  let found = await names()
  assert.ok(found.length >= 4, `found ${found}`)
  for (const name of found) assert.match(name, /(Red|Gold|Brass) Dragon/)
  assert.match(await page.getByRole('button', { name: /^Filters/ }).innerText(), /Filters \(3\)/)

  // Sorted by CR: the young dragons (CR 10) first, the ancient ones (CR 24) last.
  await select(bar, 'Sort by').selectOption('cr')
  const crs = await subtitles()
  assert.match(crs[0], /CR 10/)
  assert.match(crs.at(-1), /CR 24/)
  // The search box still narrows the filtered list.
  await page.locator('.search').fill('ancient')
  found = await names()
  assert.deepEqual(found.sort(), ['Ancient Brass Dragon', 'Ancient Gold Dragon', 'Ancient Red Dragon'])
  await shot('monster-filters')

  // Clear filters brings everything back; the sort stays.
  await page.locator('.search').fill('')
  await page.getByRole('button', { name: 'Clear filters' }).click()
  assert.ok((await names()).length > 300)
  assert.match((await subtitles())[0], /CR 0/)

  // Spells: Wizard reactions, then Dex saves of level 3.
  await page.getByRole('button', { name: 'Spells', exact: true }).click()
  await page.getByRole('button', { name: /^Filters/ }).click()
  await select(bar, 'Class').selectOption('Wizard')
  await select(bar, 'Casting time').selectOption('reaction')
  found = await names()
  assert.ok(found.includes('Shield') && found.includes('Counterspell'), `found ${found}`)
  assert.ok(!found.includes('Fireball'))
  await select(bar, 'Casting time').selectOption('')
  await select(bar, 'Level').selectOption('3')
  await select(bar, 'Attack / save').selectOption('DEX')
  found = await names()
  assert.ok(found.includes('Fireball') && found.includes('Lightning Bolt'), `found ${found}`)
  for (const s of await subtitles()) assert.match(s, /Level 3/)
  // Nothing matches → a message.
  await bar.getByLabel('Ritual').check()
  await page.locator('.results .hint', { hasText: 'No matches.' }).waitFor()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  // Sorted by level: cantrips first.
  assert.match((await subtitles())[0], /Cantrip/)

  // The encounter builder's monster picker has the same filters, and lists without a search.
  await createCampaign(page, base, 'Filters')
  await page.getByRole('link', { name: 'Encounters', exact: true }).click()
  await page.getByRole('button', { name: '+ New encounter' }).click()
  await page.waitForURL(/\/encounters\/[\w-]+$/)
  const picker = page.locator('.monster-picker')
  // The filter panel remembers it was open in Quick Lookup.
  await picker.getByRole('button', { name: /^Filters/ }).waitFor()
  if (!(await picker.locator('.filter-grid').isVisible())) await picker.getByRole('button', { name: /^Filters/ }).click()
  await select(picker, 'Type').selectOption('undead')
  await select(picker, 'Max CR').selectOption('1')
  const undead = await picker.locator('.results .result-name').allInnerTexts()
  assert.ok(undead.includes('Skeleton') && undead.includes('Zombie'), `found ${undead}`)
  assert.ok(!undead.includes('Wraith'))
  await picker.getByRole('button', { name: /^Skeleton CR/ }).click()
  await page.getByRole('button', { name: 'One more Skeleton' }).waitFor()
  await shot('encounter-picker-filters')
}
