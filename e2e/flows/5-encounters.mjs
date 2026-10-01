// Encounters: building one, difficulty in both editions (with an absent PC), and loading it
// into combat with Replace and with Add, average and rolled HP.

import { addCombatant, addPc, assert, createCampaign, trackerRows } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  await page.goto(base)
  await page.getByRole('button', { name: '2014', exact: true }).click()
  await createCampaign(page, base, 'Lost Mine')
  for (const name of ['Thorin', 'Jazz', 'Astor', 'Mira']) await addPc(page, { name, level: 3, hp: 25 })

  // Six goblins.
  await page.getByRole('link', { name: 'Encounters' }).click()
  await page.getByRole('button', { name: '+ New encounter' }).click()
  await page.waitForURL(/\/encounters\/[\w-]+$/)
  await page.getByLabel('Name', { exact: true }).fill('Goblin ambush')
  await page.locator('.monster-picker input').fill('goblin')
  await page.locator('.monster-picker .results button').first().click()
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'One more Goblin' }).click()

  // 2014: 300 XP × 2 = 600 adjusted → Medium for four level 3 PCs (Hard at 900).
  await page.locator('.difficulty .meta', { hasText: '600 adjusted XP' }).waitFor()
  assert.equal(await page.locator('.difficulty-rating').innerText(), 'Medium')
  assert.match(await page.locator('.difficulty .meta').first().innerText(), /Hard at 900/)
  // Without Mira the thresholds drop.
  await page.locator('.party-picker label', { hasText: 'Mira' }).locator('input').uncheck()
  assert.match(await page.locator('.difficulty .meta').first().innerText(), /Hard at 675/)
  await page.locator('.party-picker label', { hasText: 'Mira' }).locator('input').check()
  // 2024: 300 XP is within the Low budget.
  await page.getByRole('button', { name: '2024', exact: true }).click()
  assert.equal(await page.locator('.difficulty-rating').innerText(), 'Low')
  await page.getByText('Saved', { exact: true }).waitFor()
  await shot('encounter-editor')

  await page.getByRole('link', { name: '← Encounters' }).click()
  assert.match(await page.locator('.data-table tbody tr').first().innerText(), /Goblin ambush\s+6 × Goblin\s+Low\s+Planned/)

  // A wolf already in the fight → Replace removes it, keeps nobody else, adds the party.
  await page.getByRole('link', { name: 'Combat', exact: true }).click()
  await addCombatant(page, { name: 'Wolf', hp: 11, ac: 13, player: false })
  await page.getByRole('link', { name: 'Encounters' }).click()
  await page.getByRole('link', { name: 'Goblin ambush' }).click()
  await page.getByRole('button', { name: 'Load into combat' }).click()
  await page.getByRole('button', { name: 'Replace them' }).click()
  await page.waitForURL(/\/combat$/)
  await page.locator('tr.combatant').nth(9).waitFor()
  let rows = await trackerRows(page)
  assert.equal(rows.length, 10)
  assert.ok(!rows.some((r) => r.name === 'Wolf'), 'wolf should be replaced')
  const goblins = rows.filter((r) => r.name.startsWith('Goblin'))
  assert.equal(new Set(goblins.map((r) => r.initiative)).size, 1, 'goblins should share one initiative')
  assert.ok(goblins.every((r) => r.hp === '7 / 7'), 'average HP')
  await shot('encounter-loaded')

  await page.getByRole('link', { name: 'Encounters' }).click()
  assert.equal(await page.locator('.data-table tbody tr .tag').first().innerText(), 'Used')

  // Rolled HP, added to the goblins already there.
  await page.getByRole('link', { name: 'Goblin ambush' }).click()
  await page.getByLabel(/^Monster HP/).selectOption('roll')
  await page.getByRole('button', { name: 'Load into combat' }).click()
  await page.getByRole('button', { name: 'Add to them' }).click()
  await page.waitForURL(/\/combat$/)
  await page.locator('tr.combatant').nth(15).waitFor()
  rows = await trackerRows(page)
  const added = rows.filter((r) => /^Goblin (7|8|9|10|11|12)$/.test(r.name))
  assert.equal(added.length, 6)
  assert.ok(added.every((r) => { const hp = parseInt(r.hp); return hp >= 2 && hp <= 12 }), 'rolled 2d6 HP')
}
