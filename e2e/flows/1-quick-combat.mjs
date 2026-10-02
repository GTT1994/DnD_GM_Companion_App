// Quick combat basics: adding combatants, turn order, damage/temp HP/healing, conditions,
// saving across a refresh, Quick Lookup search and rules, and the generators.

import { addCombatant, addMonster, assert, startCombat, trackerRows } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  await page.goto(`${base}/quick-combat`)
  await page.locator('.add-form').waitFor()  // an empty fight starts with the form open
  await addCombatant(page, { name: 'Thorin', initiative: 15, hp: 34, ac: 18 })
  await addCombatant(page, { name: 'Jazz', initiative: 11, hp: 39, ac: 14 })
  await shot('add-form-open')

  // The form refuses to add someone without HP.
  const form = page.locator('.add-form')
  await form.getByLabel('Name').fill('Nobody')
  await form.getByRole('button', { name: 'Add' }).click()
  assert.equal(await page.locator('tr.combatant').count(), 2, 'invalid combatant should not be added')
  await form.getByLabel('Name').fill('')

  // The form was open because the fight was empty; ✕ closes it, the toolbar button brings it back.
  await page.getByRole('button', { name: 'Close add combatant' }).click()
  await form.waitFor({ state: 'detached' })
  await page.getByRole('button', { name: '+ Add combatant' }).click()
  await form.getByLabel('Name').waitFor()
  assert.equal(await page.evaluate(() => document.activeElement?.closest('.add-form') !== null), true, 'Name box should have the cursor')
  await page.getByRole('button', { name: 'Close add combatant' }).click()

  // ⌘K opens Quick Lookup with the search box focused; exact name matches come first.
  await page.keyboard.press('Meta+k')
  await page.locator('.search:focus').waitFor()
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await page.locator('.search').fill('fireball')
  await page.locator('.results button').first().waitFor()
  await page.locator('.search').press('Enter')
  assert.equal(await page.locator('.lookup-detail h2').innerText(), 'Fireball')

  // Rules with a table, and the 2014-only rules sections.
  await page.getByRole('button', { name: 'Rules', exact: true }).click()
  await page.locator('.search').fill('cover')
  await page.locator('.results button').first().click()
  assert.ok((await page.locator('.markdown table tr').count()) >= 4, 'cover table should show')
  await page.getByRole('button', { name: '2014', exact: true }).click()
  await page.locator('.search').fill('order of combat')
  await page.locator('.results button', { hasText: 'The Order of Combat' }).waitFor()
  await page.getByRole('button', { name: '2024', exact: true }).click()

  await addMonster(page, base, '2024', 'goblin boss', 2)

  // Turn order and HP.
  await page.goto(`${base}/quick-combat`)
  await page.locator('tr.combatant').nth(3).waitFor()
  await startCombat(page)
  await page.locator('.round', { hasText: 'Round 1' }).waitFor()

  const thorin = page.locator('tr.combatant', { hasText: 'Thorin' })
  await thorin.locator('.amount-input').fill('5')
  await thorin.getByRole('button', { name: 'Temp' }).click()
  await thorin.locator('.amount-input').fill('8')
  await thorin.locator('.amount-input').press('Enter')  // Enter = damage
  await thorin.getByText('31').waitFor()
  assert.match(await thorin.locator('.hp-text').innerText(), /^31 \/ 34/, 'temp HP should absorb damage first')
  await thorin.locator('.amount-input').fill('100')
  await thorin.getByRole('button', { name: 'Heal' }).click()
  await thorin.getByText('34 / 34').waitFor()

  await thorin.locator('.condition-select').selectOption('Prone')
  await thorin.locator('.condition-popover').getByRole('button', { name: 'Add' }).click()  // "Until removed"
  await thorin.locator('.chip', { hasText: 'Prone' }).waitFor()

  // Everything survives a refresh.
  await page.reload()
  await page.locator('tr.combatant').nth(3).waitFor()
  assert.equal((await trackerRows(page)).length, 4)
  assert.match(await page.locator('.round').innerText(), /Round 1/)
  await shot('quick-combat')

  // Generators: an NPC, and loot whose magic items open in Lookup.
  await page.goto(`${base}/generators`)
  await page.getByRole('button', { name: 'Generate NPC' }).click()
  await page.locator('.card').first().waitFor()
  await page.getByRole('tab', { name: 'Loot' }).click()
  await page.getByRole('button', { name: 'Generate loot' }).click()
  await page.locator('.card').first().waitFor()
  const item = page.locator('.card button.link').first()
  if (await item.count()) {
    const name = await item.innerText()
    await item.click()
    assert.equal(await page.locator('.lookup-detail h2').innerText(), name)
  }
}
