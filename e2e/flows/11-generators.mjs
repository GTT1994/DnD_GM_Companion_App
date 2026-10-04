// The generator tabs inside a campaign: names (made into an NPC), a random encounter (saved,
// and loaded into combat), rumours and hooks (into the session plan and notes), a tavern (owner
// saved as an NPC), shops (equipment and magic items, opening in Quick Lookup), and equipment
// in Quick Lookup.

import { addPc, assert, createCampaign } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  await page.goto(base)
  await page.getByRole('button', { name: '2024', exact: true }).click()
  const campaignUrl = await createCampaign(page, base, 'Generated')
  for (const name of ['Thorin', 'Jazz', 'Astor', 'Mira']) await addPc(page, { name, level: 3, hp: 25 })
  await page.getByRole('button', { name: 'Start from template' }).click()
  await page.getByText('Saved', { exact: true }).first().waitFor()
  const tab = (name) => page.getByRole('tab', { name }).click()
  await page.getByRole('link', { name: 'Generators' }).click()

  // Names: ten female dwarf names; one becomes an NPC.
  await tab('Names')
  await page.getByLabel('Species').selectOption('Dwarf')
  await page.getByLabel('Gender').selectOption('Female')
  await page.getByRole('button', { name: 'Generate names' }).click()
  const names = page.locator('.name-list li')
  assert.equal(await names.count(), 10)
  assert.ok((await names.allInnerTexts()).every((t) => /Female Dwarf/.test(t)))
  const picked = await names.first().locator('.generated-name').innerText()
  await names.first().getByRole('button', { name: 'Make NPC' }).click()
  await page.waitForURL(/\/npcs\//)
  assert.equal(await page.locator('.npc-view-header h2').innerText(), picked)
  assert.equal(await page.locator('label', { hasText: /^Species/ }).locator('select').inputValue(), 'Dwarf')
  assert.equal(await page.locator('.editor-form').getByLabel('Gender', { exact: true }).inputValue(), 'Female')

  // A Moderate forest encounter for the party, saved as an encounter.
  await page.getByRole('link', { name: 'Generators' }).click()
  await tab('Encounter')
  await page.getByLabel('Environment').selectOption('forest')
  await page.getByLabel('Difficulty').selectOption('Moderate')
  await page.locator('.generator-party input[type=checkbox]').nth(3).waitFor()  // the party, loaded
  assert.equal(await page.locator('.generator-party input[type=checkbox]').count(), 4)
  await page.getByRole('button', { name: 'Generate encounter' }).click()
  const encounter = page.locator('.random-encounter').first()
  assert.equal(await encounter.locator('h3 .tag').innerText(), 'Moderate')
  await shot('generator-encounter')
  await encounter.getByRole('button', { name: 'Save as encounter' }).click()
  await page.waitForURL(/\/encounters\/[\w-]+$/)
  assert.match(await page.getByLabel('Name', { exact: true }).inputValue(), /^Forest: /)
  assert.equal(await page.locator('.difficulty-rating').innerText(), 'Moderate')

  // …and loaded straight into combat, with the party.
  await page.getByRole('link', { name: 'Generators' }).click()
  await page.locator('.random-encounter').first().getByRole('button', { name: 'Load into combat' }).click()
  await page.waitForURL(/\/combat$/)
  await page.locator('tbody.combatant', { hasText: 'Thorin' }).waitFor()
  assert.ok((await page.locator('tbody.combatant.monster').count()) >= 1)

  // Rumours into the plan, a hook into the notes.
  await page.getByRole('link', { name: 'Generators' }).click()
  await tab('Rumours & hooks')
  await page.getByRole('button', { name: 'Generate rumours' }).click()
  const rumours = page.locator('.rumour-card').first()
  assert.equal(await rumours.locator('li').count(), 3)
  const rumour = (await rumours.locator('li').first().innerText()).split(/\s(True|Partly true|False)\b/)[0]
  await rumours.getByRole('button', { name: 'Add to session plan' }).click()
  await rumours.getByRole('button', { name: 'In session plan ✓' }).waitFor()
  await page.getByRole('button', { name: 'Generate plot hook' }).click()
  const hook = page.locator('.hook-card').first()
  await hook.getByRole('button', { name: 'Add to campaign notes' }).click()
  await hook.getByRole('button', { name: 'In campaign notes ✓' }).waitFor()

  // A tavern: owner saved as an NPC, tavern added to the plan.
  await tab('Tavern')
  await page.getByRole('button', { name: 'Generate tavern' }).click()
  const tavern = page.locator('.tavern-card').first()
  const tavernName = await tavern.locator('h3').innerText()
  await tavern.getByRole('button', { name: 'Save as NPC' }).click()
  await tavern.getByText('Saved ✓').waitFor()
  await tavern.getByRole('button', { name: 'Add to session plan' }).click()
  await tavern.getByRole('button', { name: 'In session plan ✓' }).waitFor()

  // Shops: a village blacksmith (cheap mundane stock), and a city magic shop.
  await tab('Shop')
  await page.getByLabel('Shop type').selectOption('blacksmith')
  await page.getByLabel('Settlement size').selectOption('village')
  await page.getByRole('button', { name: 'Generate shop' }).click()
  assert.ok((await page.locator('.shop-card').first().locator('.shop-stock tr').count()) > 0)
  await page.getByLabel('Shop type').selectOption('magic')
  await page.getByLabel('Settlement size').selectOption('city')
  await page.getByRole('button', { name: 'Generate shop' }).click()
  const magic = page.locator('.shop-card').first()
  assert.match(await magic.locator('.shop-stock').innerText(), /(Common|Uncommon|Rare|Very Rare)[\s\S]*\d gp/)
  await shot('generator-shop')
  // Equipment opens in Quick Lookup (newest shop first, so the blacksmith is now second).
  await page.locator('.shop-card').nth(1).locator('.shop-stock button.link').first().click()
  await page.waitForURL(/\/lookup$/)
  await page.locator('.equipment-stats dt', { hasText: 'Cost' }).waitFor()

  // The Overview: rumour and tavern in the plan, hook in the notes. NPCs: the dwarf and the innkeeper.
  await page.getByRole('link', { name: 'Overview' }).click()
  const plan = page.getByRole('textbox', { name: 'Session plan' })
  await plan.locator('h2').first().waitFor()
  const planText = await plan.innerText()
  assert.ok(planText.indexOf(rumour.trim()) > planText.indexOf('Secrets & clues'), 'rumour under Secrets & clues')
  assert.ok(planText.indexOf(tavernName) > planText.indexOf('Locations'), 'tavern under Locations')
  assert.match(await page.getByRole('textbox', { name: 'Campaign notes' }).innerText(), /Hook: /)
  await page.getByRole('link', { name: 'NPCs' }).click()
  await page.waitForFunction(() => document.querySelectorAll('.npc-table tbody tr').length === 2)

  // Equipment in Quick Lookup.
  await page.goto(`${campaignUrl}/lookup`)
  await page.getByRole('button', { name: 'Equipment', exact: true }).click()
  await page.locator('.search').fill('longsword')
  await page.locator('.results button').first().click()
  assert.match(await page.locator('.equipment-stats').innerText(), /Damage\s+1d8 Slashing/)

  // A 2024 magic item table that used to be scrambled shows as a full table.
  await page.getByRole('button', { name: 'Magic Items', exact: true }).click()
  await page.locator('.search').fill('bag of beans')
  await page.locator('.results button').first().click()
  assert.equal(await page.locator('.markdown table tbody tr').count(), 12)
  await shot('magic-item-table')
}
