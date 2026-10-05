// Mini labels: which mini on the table is which guard. Labels from ✎ and the ⋯ menu (text and/or a
// colour), shown in the row, the turn line, the panel and target lists; kept after a refresh;
// cleared and brought back with Undo.

import { addCombatant, addMonster, assert, rowMenu, startCombat } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  await addMonster(page, base, '2014', 'guard', 3)
  await page.goto(`${base}/quick-combat`)
  await addCombatant(page, { name: 'Thorin', initiative: 25, hp: 40, ac: 18 })
  await page.getByRole('button', { name: 'Close add combatant' }).click()
  const row = (name) => page.locator('tbody.combatant').filter({ has: page.getByRole('button', { name, exact: true }) })
  const badge = (name) => row(name).locator('.mini-badge')

  // Guard 2: text and a blue dot, from the ✎ by the name.
  await row('Guard 2').getByRole('button', { name: 'Mini label for Guard 2' }).click()
  const form = page.getByRole('dialog', { name: 'Mini label for Guard 2' })
  await form.getByLabel('Mini description').fill('with shield')
  await form.getByRole('button', { name: 'blue' }).click()
  await form.getByRole('button', { name: 'Save' }).click()
  await badge('Guard 2').waitFor()
  assert.equal(await badge('Guard 2').getAttribute('title'), 'Mini: with shield')
  assert.equal(await badge('Guard 2').locator('.mini-dot').count(), 1)

  // Guard 3 from the ⋯ menu, text only; Guard 1 a red dot only.
  await (await rowMenu(row('Guard 3'))).getByRole('button', { name: 'Mini label…' }).click()
  await page.getByLabel('Mini description').fill('bald, spear')
  await page.getByLabel('Mini description').press('Enter')
  await badge('Guard 3').waitFor()
  assert.equal(await badge('Guard 3').innerText(), 'bald, spear')
  await row('Guard').getByRole('button', { name: 'Mini label for Guard' }).click()
  await page.getByRole('dialog', { name: 'Mini label for Guard' }).getByRole('button', { name: 'red' }).click()
  await page.getByRole('dialog', { name: 'Mini label for Guard' }).getByRole('button', { name: 'Save' }).click()
  await badge('Guard').waitFor()
  assert.equal(await badge('Guard').getAttribute('title'), 'Mini: red')
  // Players don't get one.
  assert.equal(await row('Thorin').getByRole('button', { name: /^Mini label/ }).count(), 0)

  // Kept after a refresh.
  await page.reload()
  await badge('Guard 2').waitFor()
  assert.equal(await badge('Guard 3').innerText(), 'bald, spear')

  // On Guard 2's turn: the turn line and the panel say which mini it is.
  await startCombat(page)
  for (let i = 0; i < 6; i++) {
    const text = await page.locator('.round').textContent()
    if (text.includes("Guard 2 (with shield)'s turn")) break
    await page.getByRole('button', { name: 'Next turn ▶' }).click()
    await page.waitForFunction((old) => document.querySelector('.round')?.textContent !== old, text)
  }
  assert.match(await page.locator('.round').textContent(), /Guard 2 \(with shield\)'s turn/)
  await page.locator('.monster-panel .mini-line', { hasText: 'with shield' }).waitFor()

  // Target lists name the minis.
  await page.locator('.monster-panel .action-card').first().getByRole('button', { name: /^Damage/ }).click()
  const targets = await page.locator('.monster-panel .apply-row select').first().locator('option').allInnerTexts()
  assert.ok(targets.includes('Guard 3 (bald, spear) (11/11)'), `targets: ${targets}`)
  assert.ok(targets.includes('Guard (red) (11/11)'), `targets: ${targets}`)
  await shot('mini-labels')

  // Clear Guard 3's label, then Undo brings it back.
  await row('Guard 3').getByRole('button', { name: 'Mini label for Guard 3' }).click()
  await page.getByRole('button', { name: 'Clear label' }).click()
  await badge('Guard 3').waitFor({ state: 'detached' })
  assert.match(await page.getByRole('button', { name: 'Undo' }).getAttribute('title'), /Guard 3 mini label/)
  await page.getByRole('button', { name: 'Undo' }).click()
  await badge('Guard 3').waitFor()
}
