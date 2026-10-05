// Reactions: the row's ⟲ Reaction button, Undo, the mark clearing when that creature's turn starts
// (and not before), Parry from the panel's Reactions section, and Shield (a reaction spell) marking it.

import { addCombatant, addMonster, assert, startCombat } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  await addMonster(page, base, '2014', 'bandit captain')
  await addMonster(page, base, '2014', 'mage')
  await page.goto(`${base}/quick-combat`)
  await addCombatant(page, { name: 'Thorin', initiative: 30, hp: 40, ac: 18 })
  await page.getByRole('button', { name: 'Close add combatant' }).click()
  const row = (name) => page.locator('tbody.combatant').filter({ has: page.locator('.name-cell', { hasText: new RegExp(`^${name}`) }) })
  const reaction = (name) => row(name).locator('.reaction-toggle')
  const isUsed = async (name) => (await reaction(name).getAttribute('aria-pressed')) === 'true'
  const waitUsed = (name, used = true) => row(name).locator(`.reaction-toggle[aria-pressed="${used}"]`).waitFor()
  const next = async () => {
    const text = await page.locator('.round').textContent()
    await page.getByRole('button', { name: 'Next turn ▶' }).click()
    await page.waitForFunction((old) => document.querySelector('.round')?.textContent !== old, text)
  }

  // Thorin's turn: the captain makes an opportunity attack.
  await startCombat(page)
  await reaction('Bandit Captain').click()
  await waitUsed('Bandit Captain')
  // Undo takes it back; mark it again.
  assert.match(await page.getByRole('button', { name: 'Undo' }).getAttribute('title'), /Bandit Captain reaction/)
  await page.getByRole('button', { name: 'Undo' }).click()
  await waitUsed('Bandit Captain', false)
  await reaction('Bandit Captain').click()
  await waitUsed('Bandit Captain')
  await reaction('Thorin').click()
  await waitUsed('Thorin')
  await shot('reactions')

  // Turns go by: each mark clears only when that creature's own turn starts.
  for (let i = 0; i < 3; i++) {
    const text = await page.locator('.round').textContent()
    if (text.includes("Bandit Captain's turn")) break
    await next()
  }
  await page.locator('.round', { hasText: "Bandit Captain's turn" }).waitFor()
  assert.equal(await isUsed('Bandit Captain'), false, 'back at the start of its turn')
  assert.equal(await isUsed('Thorin'), true, "Thorin's stays used until his turn")

  // Parry from the panel (which opened on the captain's turn) marks it and logs it.
  const parry = page.locator('.monster-panel .action-card', { hasText: 'Parry' })
  await parry.getByRole('button', { name: 'Use' }).click()
  await parry.getByRole('button', { name: 'Reaction used' }).waitFor()
  assert.equal(await parry.getByRole('button', { name: 'Reaction used' }).isDisabled(), true)
  await page.locator('.monster-panel .reaction-tag').waitFor()
  assert.equal(await isUsed('Bandit Captain'), true)
  await page.locator('.roll-log li', { hasText: 'Bandit Captain uses Parry (reaction)' }).waitFor()

  // The mage casts Shield (a reaction spell): its reaction is used; a second cast warns.
  await row('Mage').locator('.name-cell button.link').click()
  const shield = page.locator('.monster-panel .spell-row').filter({ has: page.getByRole('button', { name: 'Shield', exact: true }) })
  await shield.getByRole('button', { name: 'Cast' }).click()
  await waitUsed('Mage')
  await shield.getByText('Reaction already used').waitFor()
  await page.locator('.roll-log li', { hasText: /Mage casts Shield.*\(reaction\)/ }).waitFor()

  // Back round to Thorin: his reaction comes back.
  for (let i = 0; i < 4 && !(await page.locator('.round').textContent()).includes("Thorin's turn"); i++) await next()
  assert.equal(await isUsed('Thorin'), false)
}
