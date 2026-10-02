// The initiative prompt at Start combat, Undo / Redo (buttons and ⌘Z / ⇧⌘Z, including PC HP on
// the party cards), and Reset combat from the More menu (and undoing it).

import { addMonster, addPc, assert, createCampaign, moreMenu, trackerRows } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  const campaignUrl = await createCampaign(page, base, 'Undo Test')
  await addPc(page, { name: 'Thorin', hp: 30 })
  await addPc(page, { name: 'Jazz', hp: 24 })
  await addMonster(page, campaignUrl, '2024', 'goblin warrior')  // the campaign's Lookup adds to its fight
  await page.goto(`${campaignUrl}/combat`)
  await page.getByRole('button', { name: 'Add party' }).click()
  await page.locator('tr.combatant').nth(2).waitFor()
  const initiativeOf = async (name) => (await trackerRows(page)).find((r) => r.name === name)?.initiative
  const thorinBefore = await initiativeOf('Thorin')

  // Start combat asks for the players' rolls only.
  await page.getByRole('button', { name: 'Start combat' }).click()
  const prompt = page.getByRole('form', { name: 'Roll for initiative' })
  assert.deepEqual((await prompt.locator('.initiative-name').allInnerTexts()).sort(), ['Jazz', 'Thorin'])
  assert.equal(await prompt.locator('.initiative-name', { hasText: 'Goblin' }).count(), 0)
  await prompt.getByLabel('Initiative for Thorin').fill('25')
  await prompt.getByRole('button', { name: 'Roll for Jazz' }).click()
  const jazzRoll = parseInt(await prompt.getByLabel('Initiative for Jazz').inputValue())
  assert.ok(jazzRoll >= 1 && jazzRoll <= 20, 'Jazz rolled a d20')
  await shot('initiative-prompt')
  await prompt.getByLabel('Initiative for Thorin').press('Enter')
  await page.locator('tr.combatant.active', { hasText: 'Thorin' }).waitFor()  // 25 beats any goblin roll
  assert.equal(await initiativeOf('Jazz'), String(jazzRoll))

  // Undo the start (one step, rolls included), then redo it, with the keyboard.
  const undo = page.getByRole('button', { name: 'Undo' })
  const redo = page.getByRole('button', { name: 'Redo' })
  assert.equal(await undo.getAttribute('title'), 'Undo: start combat (⌘Z)')
  await page.locator('h1, .round').first().click()  // focus outside any box
  await page.keyboard.press('Meta+z')
  await page.locator('.round', { hasText: 'Not started' }).waitFor()
  assert.equal(await initiativeOf('Thorin'), thorinBefore)
  await page.keyboard.press('Meta+Shift+z')
  await page.locator('.round', { hasText: 'Round 1' }).waitFor()
  assert.equal(await initiativeOf('Thorin'), '25')

  // Damage to a PC: Undo also puts the party card's HP back.
  const thorin = page.locator('tr.combatant', { hasText: 'Thorin' })
  await thorin.locator('.amount-input').fill('10')
  await thorin.locator('.amount-input').press('Enter')
  await thorin.getByText('20 / 30').waitFor()
  assert.equal(await redo.isDisabled(), true, 'a new change clears Redo')
  assert.equal(await undo.getAttribute('title'), 'Undo: 10 damage to Thorin (⌘Z)')
  await undo.click()
  await thorin.getByText('30 / 30').waitFor()
  await page.getByRole('link', { name: 'Overview' }).click()
  await page.locator('.pc-card', { hasText: 'Thorin' }).getByText('30 / 30').waitFor()

  // Reset combat: hurt the goblin, give it a condition, move on a turn, then reset.
  await page.getByRole('link', { name: 'Combat', exact: true }).click()
  const goblin = page.locator('tr.combatant', { hasText: 'Goblin' })
  await goblin.locator('.amount-input').fill('3')
  await goblin.locator('.amount-input').press('Enter')
  await goblin.locator('.condition-select').selectOption('Prone')
  await goblin.locator('.condition-popover').getByRole('button', { name: 'Add' }).click()
  await page.getByRole('button', { name: /Next turn/ }).click()
  await page.locator('tr.combatant.active', { hasText: 'Thorin' }).waitFor({ state: 'detached' })
  await moreMenu(page, 'Reset combat')
  await page.locator('.round', { hasText: 'Not started' }).waitFor()
  const rows = await trackerRows(page)
  assert.ok(rows.every((r) => { const [hp, max] = r.hp.split(' / ').map((n) => parseInt(n)); return hp === max }), 'everyone at full HP')
  assert.equal(await page.locator('.chip').count(), 0)
  await shot('after-reset')

  // …and Undo brings the fight back as it was.
  assert.equal(await undo.getAttribute('title'), 'Undo: reset combat (⌘Z)')
  await undo.click()
  await page.locator('.round', { hasText: 'Round 1' }).waitFor()
  await goblin.locator('.chip', { hasText: 'Prone' }).waitFor()
}
