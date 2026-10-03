// Dice roller: the D key and 🎲 button on any page, quick dice building a roll, keep-highest and
// advantage, a bad roll, favourites that survive a reload, Esc to close, D while typing in a box,
// and clicking dice in a spell's text in Quick Lookup.

import { assert } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  await page.goto(base)
  const tray = page.getByRole('dialog', { name: 'Dice roller' })
  const input = tray.getByLabel('Dice to roll')
  const top = tray.locator('.dice-roll').first()

  // D opens the tray with the cursor in the box.
  await page.locator('body').press('d')
  await input.waitFor()
  assert.equal(await input.evaluate((el) => el === document.activeElement), true)

  // Quick dice build a roll: d6, d6, d8 → 2d6+1d8.
  for (const d of ['d6', 'd6', 'd8']) await tray.getByRole('button', { name: d, exact: true }).click()
  assert.equal(await input.inputValue(), '2d6+1d8')
  await tray.getByRole('button', { name: 'Roll', exact: true }).click()
  assert.equal(await top.locator('.die').count(), 3)
  const total = Number(await top.locator('.dice-total').textContent())
  assert.ok(total >= 3 && total <= 20, `2d6+1d8 rolled ${total}`)

  // After a roll, the next quick die starts a new roll.
  await tray.getByRole('button', { name: 'd20', exact: true }).click()
  assert.equal(await input.inputValue(), '1d20')

  // Keep highest, and advantage: the dropped dice are struck through.
  await input.fill('4d6kh3')
  await input.press('Enter')
  assert.equal(await top.locator('.die').count(), 4)
  assert.equal(await top.locator('.die.dropped').count(), 1)
  await input.fill('d20+5 adv')
  await input.press('Enter')
  assert.equal(await top.locator('.dice-what').textContent(), 'd20+5 adv')
  assert.equal(await top.locator('.die.dropped').count(), 1)
  assert.equal(await tray.locator('.dice-roll').count(), 3)

  // Text that isn't dice gets a message, not a roll.
  await input.fill('fireball')
  await input.press('Enter')
  await tray.locator('.dice-error').waitFor()
  assert.equal(await tray.locator('.dice-roll').count(), 3)

  // A favourite, rolled with one click.
  await input.fill('1d4+1')
  await tray.getByRole('button', { name: 'Save as favourite' }).click()
  await tray.getByLabel('Favourite name').fill('Dagger')
  await tray.getByLabel('Favourite name').press('Enter')
  await tray.getByRole('button', { name: 'Dagger', exact: true }).click()
  assert.equal(await top.locator('.dice-what').textContent(), 'Dagger: 1d4+1')
  await shot('dice-tray')

  // Esc closes it; history and favourites are still there after a reload.
  await input.press('Escape')
  await tray.waitFor({ state: 'hidden' })
  await page.reload()
  await page.getByRole('button', { name: 'Dice roller' }).click()
  await tray.getByRole('button', { name: 'Dagger', exact: true }).waitFor()
  assert.equal(await tray.locator('.dice-roll').count(), 4)
  await tray.getByRole('button', { name: 'Remove Dagger' }).click()
  assert.equal(await tray.locator('.dice-favourite').count(), 0)
  await tray.getByRole('button', { name: 'Clear history' }).click()
  await tray.getByRole('button', { name: 'Close dice roller' }).click()

  // Typing a "d" in a box doesn't open the tray.
  await page.goto(`${base}/lookup`)
  await page.getByRole('button', { name: '2014', exact: true }).click()
  await page.getByRole('button', { name: 'Spells', exact: true }).click()
  await page.locator('.search').fill('fireball')
  assert.equal(await tray.isVisible(), false)

  // Dice in a spell's text roll in the tray, labelled with the spell.
  await page.locator('.results button').first().waitFor()
  await page.locator('.search').press('Enter')
  await page.locator('article h2', { hasText: 'Fireball' }).waitFor()
  await page.locator('button.dice-link', { hasText: '8d6' }).first().click()
  await tray.waitFor()
  assert.equal(await top.locator('.dice-what').textContent(), 'Fireball: 8d6')
  assert.equal(await top.locator('.die').count(), 8)
  await shot('dice-from-spell')
}
