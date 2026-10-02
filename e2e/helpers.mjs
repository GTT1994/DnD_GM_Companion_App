// Shared steps for the browser test flows.

import assert from 'node:assert/strict'

export { assert }

// Opens a monster's stat block in Quick Lookup for an edition.
export async function openMonster(page, base, edition, search) {
  await page.goto(`${base}/lookup`)
  await page.getByRole('button', { name: edition, exact: true }).click()
  await page.getByRole('button', { name: 'Monsters', exact: true }).click()
  await page.locator('.search').fill(search)
  await page.locator('.results button').first().waitFor()
  await page.locator('.search').press('Enter')
  await page.locator('.stat-block h2').waitFor()
}

// Adds a monster to the current fight from its stat block, waiting until it's saved.
export async function addMonster(page, base, edition, search, count = 1) {
  await openMonster(page, base, edition, search)
  await page.locator('.add-monster input').fill(String(count))
  await page.getByRole('button', { name: 'Add to combat' }).click()
  await page.getByText(/^Added \d/).waitFor()
}

// Adds a combatant with the tracker's form, opening it first if it's closed.
export async function addCombatant(page, { name, initiative = '', hp, ac, player = true }) {
  await page.locator('.toolbar').waitFor()
  if (!(await page.locator('.add-form').isVisible())) await page.getByRole('button', { name: '+ Add combatant' }).click()
  const form = page.locator('.add-form')
  await form.getByLabel('Name').fill(name)
  await form.getByLabel('Initiative').fill(String(initiative))
  await form.getByLabel('Max HP').fill(String(hp))
  await form.getByLabel('AC').fill(String(ac))
  const box = form.locator('input[type=checkbox]')
  if ((await box.isChecked()) !== player) await box.click()
  await form.getByLabel('Name').press('Enter')
  await page.locator('tr.combatant', { hasText: name }).first().waitFor()
}

// Creates a campaign from the home page and returns its address.
export async function createCampaign(page, base, name) {
  await page.goto(base)
  await page.getByRole('button', { name: '+ New campaign' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByRole('button', { name: 'Create' }).click()
  await page.waitForURL(/\/campaign\/[\w-]+$/)
  return page.url()
}

// Adds a PC on a campaign's Overview page.
export async function addPc(page, { name, level = 5, ac = 15, hp = 30, perception }) {
  await page.getByRole('button', { name: '+ Add PC' }).click()
  await page.getByLabel('Character name', { exact: true }).fill(name)
  await page.getByLabel('Level', { exact: true }).fill(String(level))
  await page.getByLabel('AC', { exact: true }).fill(String(ac))
  await page.getByLabel('Max HP', { exact: true }).fill(String(hp))
  if (perception) await page.getByLabel('Passive Perception', { exact: true }).fill(String(perception))
  await page.getByRole('button', { name: 'Add to party' }).click()
  await page.locator('.pc-card', { hasText: name }).waitFor()
}

// Drop-downs: their accessible name includes the selected option, so match the label's start.
export const select = (scope, text) => scope.locator('label').filter({ hasText: new RegExp(`^${text}`) }).locator('select')

// Each tracker row as { name, initiative, hp }.
export function trackerRows(page) {
  return page.locator('tr.combatant').evaluateAll((trs) => trs.map((tr) => ({
    name: tr.querySelector('.name-cell button, .name-cell')?.firstChild?.textContent?.trim(),
    initiative: tr.querySelector('.init-input')?.value,
    hp: tr.querySelector('.hp-text')?.textContent?.trim(),
  })))
}

// Presses Start combat; when the initiative prompt opens (players in the fight), keeps their numbers.
export async function startCombat(page) {
  await page.getByRole('button', { name: 'Start combat' }).click()
  const skip = page.locator('.initiative-prompt').getByRole('button', { name: 'Skip' })
  await skip.or(page.locator('.round', { hasText: 'Round 1' })).first().waitFor()
  if (await skip.isVisible()) await skip.click()
  await page.locator('.round', { hasText: 'Round 1' }).waitFor()
}

// Picks an action from the combat toolbar's "More ▾" menu.
export async function moreMenu(page, label) {
  await page.getByRole('button', { name: 'More ▾' }).click()
  await page.getByRole('menuitem', { name: label }).click()
}
