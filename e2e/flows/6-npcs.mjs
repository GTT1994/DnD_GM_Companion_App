// NPCs: writing a custom NPC (custom species, portrait, Markdown notes), a stat block that adds
// them to combat under their own name, search and filters, duplicate and delete.

import { writeFile } from 'node:fs/promises'
import { assert, createCampaign } from '../helpers.mjs'

// A 2×2 red PNG, for the portrait upload.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg=='

export default async function ({ page, base, shot, shotsDir }) {
  await page.goto(base)
  await page.getByRole('button', { name: '2024', exact: true }).click()
  await createCampaign(page, base, 'Lost Mine')
  await page.getByRole('link', { name: 'NPCs' }).click()
  await page.getByText('No NPCs yet.').waitFor()

  // A new NPC with every kind of field.
  await page.getByRole('button', { name: '+ New NPC' }).click()
  await page.waitForURL(/\/npcs\/[\w-]+$/)
  const field = (label) => page.locator('.editor-form').getByLabel(label, { exact: true })
  await field('Name').fill('Captain Vex')
  await page.locator('label', { hasText: /^Species/ }).locator('select').selectOption('custom')
  await field('Custom species').fill('Kenku')
  await field('Gender').fill('Female')
  await field('Role').fill('Cult leader')
  await field('Location').fill('Wave Echo Cave')
  await field('Faction').fill('Black Spider')
  await page.locator('label', { hasText: /^Attitude/ }).locator('select').selectOption('hostile')
  await field('Secret').fill('Works for the Black Spider')
  await field('Notes').fill('## History\n\nOnce a **sailor**.\n\n- Hates dwarves')

  const png = `${shotsDir}portrait.png`
  await writeFile(png, Buffer.from(PNG, 'base64'))
  await page.locator('.portrait-field input[type=file]').setInputFiles(png)
  await page.locator('.npc-view img.portrait').waitFor()
  assert.match(await page.locator('.npc-view img.portrait').getAttribute('src'), /^data:image\/jpeg;base64,/)

  // The view beside the form formats the notes.
  const view = page.locator('.npc-view')
  assert.equal(await view.locator('.npc-view-header h2').innerText(), 'Captain Vex')
  assert.equal(await view.locator('p.meta').first().innerText(), 'Female Kenku Cult leader')
  assert.equal(await view.locator('.markdown strong').innerText(), 'sailor')
  assert.equal(await view.locator('.markdown h2').innerText(), 'History')

  // Stat block: Bandit Captain, then add her to the campaign's fight twice.
  await page.locator('.monster-picker input').fill('bandit captain')
  await page.locator('.monster-picker .results button').first().click()
  await page.getByText('Fights as').waitFor()
  await page.getByRole('button', { name: 'Add to combat' }).click()
  await page.getByText('Added to combat.').waitFor()
  await page.getByRole('button', { name: 'Add to combat' }).click()
  await page.getByText('Saved', { exact: true }).waitFor()
  await shot('npc-page')

  await page.getByRole('link', { name: 'Go to combat' }).click()
  await page.locator('tr.combatant').nth(1).waitFor()
  const names = await page.locator('tr.combatant .name-cell button.link').allInnerTexts()
  assert.deepEqual(names.sort(), ['Captain Vex', 'Captain Vex 2'])
  // Her name opens the Bandit Captain's actions.
  await page.locator('tr.combatant', { hasText: 'Captain Vex 2' }).locator('button.link').click()
  await page.locator('.monster-panel .action-card').first().waitFor()

  // A generated-style NPC typed quickly, leaving the page straight away: still saved.
  await page.getByRole('link', { name: 'NPCs' }).click()
  await page.getByRole('button', { name: '+ New NPC' }).click()
  await page.waitForURL(/\/npcs\/[\w-]+$/)
  await field('Name').fill('Anna')
  await page.locator('label', { hasText: /^Species/ }).locator('select').selectOption('Human')
  await field('Location').fill('Phandalin')
  await page.locator('label', { hasText: /^Attitude/ }).locator('select').selectOption('friendly')
  await page.getByRole('link', { name: '← NPCs' }).click()

  // The list: both NPCs, sorted, with portrait, tags; search and filters.
  const rows = page.locator('.npc-table tbody tr')
  await page.waitForFunction(() => document.querySelectorAll('.npc-table tbody tr').length === 2)
  await page.locator('.npc-table td', { hasText: 'Phandalin' }).waitFor()
  assert.deepEqual(await page.locator('.npc-table .name-cell').allInnerTexts(), ['Anna', 'Captain Vex'])
  assert.match(await rows.nth(1).innerText(), /Kenku · Female\s+Cult leader\s+Wave Echo Cave\s+Black Spider\s+Hostile\s+Alive/)
  assert.equal(await rows.nth(1).locator('img.portrait-thumb').count(), 1)
  await shot('npc-list')
  await page.getByLabel('Search NPCs').fill('sailor')  // found in the notes
  assert.deepEqual(await page.locator('.npc-table .name-cell').allInnerTexts(), ['Captain Vex'])
  await page.getByLabel('Search NPCs').fill('')
  await page.getByLabel('Attitude').selectOption('friendly')
  assert.deepEqual(await page.locator('.npc-table .name-cell').allInnerTexts(), ['Anna'])
  await page.getByLabel('Attitude').selectOption('all')

  // Kill Vex: survives a refresh, and the custom species comes back as "Custom…".
  await page.getByRole('link', { name: 'Captain Vex' }).click()
  await page.locator('label', { hasText: /^Status/ }).locator('select').selectOption('dead')
  await page.getByText('Saved', { exact: true }).waitFor()
  await page.reload()
  assert.equal(await field('Custom species').inputValue(), 'Kenku')
  assert.equal(await page.locator('label', { hasText: /^Status/ }).locator('select').inputValue(), 'dead')

  // Duplicate, then delete the copy.
  await page.getByRole('button', { name: 'Duplicate' }).click()
  await page.locator('.npc-view-header h2', { hasText: 'Captain Vex (copy)' }).waitFor()
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.waitForURL(/\/npcs$/)
  await page.waitForFunction(() => document.querySelectorAll('.npc-table tbody tr').length === 2)
  assert.equal(await page.locator('.npc-table tr.npc-dead').count(), 1)
}
