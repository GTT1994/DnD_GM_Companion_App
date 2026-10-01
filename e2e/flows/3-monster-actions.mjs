// The monster actions panel: to hit with advantage, critical hits, damage tick boxes, applying
// damage, recharge, legendary actions, spell slots and upcasting, concentration, the quick roller,
// and the panel following the turn.

import { addCombatant, addMonster, assert } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  await page.goto(base)
  await addMonster(page, base, '2024', 'goblin boss')
  await addMonster(page, base, '2024', 'adult red dragon')
  await addMonster(page, base, '2014', 'archmage')
  await page.goto(`${base}/quick-combat`)
  await addCombatant(page, { name: 'Thorin', initiative: 30, hp: 60, ac: 18 })
  await addCombatant(page, { name: 'Bandit', initiative: 1, hp: 11, ac: 12, player: false })
  await page.locator('tr.combatant').nth(4).waitFor()

  const panel = page.locator('.monster-panel')
  const card = (name) => panel.locator('.action-card', { has: page.locator('.action-title strong', { hasText: name }) }).first()
  const open = (name) => page.locator('tr.combatant', { hasText: name }).locator('button.link').click()

  // Goblin Boss: conditional extra damage starts unticked; a natural 20 doubles the dice.
  await open('Goblin Boss')
  const scimitar = card('Scimitar')
  await scimitar.locator('.damage-parts input').first().waitFor()  // wait for the panel to draw
  assert.deepEqual(await scimitar.locator('.damage-parts input').evaluateAll((els) => els.map((e) => e.checked)), [true, false])
  await panel.getByRole('button', { name: 'Advantage', exact: true }).click()
  await page.evaluate(() => { window.realRandom = Math.random; Math.random = () => 0.99 })  // force natural 20s
  await scimitar.getByRole('button', { name: /To hit/ }).click()
  await page.evaluate(() => { Math.random = window.realRandom })
  assert.match(await scimitar.locator('.roll-result').first().innerText(), /Critical/)
  assert.match(await scimitar.locator('.damage-roller button.roll').innerText(), /×2 dice/)
  await scimitar.locator('.damage-roller button.roll').click()
  assert.equal(await scimitar.locator('.damage-roller .roll-result .meta').innerText().then((t) => t.match(/\[(.*?)\]/)[1].split(',').length), 2, 'crit should roll two d6')
  const thorinOption = await scimitar.locator('.apply-row option', { hasText: 'Thorin' }).getAttribute('value')
  await scimitar.locator('.apply-row select').selectOption(thorinOption)
  const damage = parseInt((await scimitar.locator('.apply-row button').first().innerText()).replace(/\D/g, ''))
  await scimitar.locator('.apply-row button').first().click()
  await page.locator('tr.combatant', { hasText: 'Thorin' }).getByText(`${60 - damage} / 60`).waitFor()

  // Dragon: recharge and legendary actions.
  await open('Adult Red Dragon')
  const breath = card('Fire Breath')
  assert.match(await breath.locator('.chip-static').innerText(), /DC 21 DEX save, half on success/)
  await breath.getByRole('button', { name: 'Mark used' }).click()
  await breath.getByRole('button', { name: 'Roll recharge' }).waitFor()
  await panel.locator('.panel-section', { hasText: 'Legendary Actions' }).locator('.action-card').first().getByRole('button', { name: /^Use/ }).click()
  await panel.getByText('2 of 3 left this round').waitFor()
  await shot('dragon-panel')

  // Archmage (2014): upcast Lightning Bolt with a 5th level slot, then concentrate on Fly.
  await open('Archmage')
  const bolt = panel.locator('.spell-row', { hasText: 'Lightning Bolt' }).first()
  await bolt.locator('select').selectOption('5')
  await bolt.getByRole('button', { name: 'Cast' }).click()
  await panel.locator('.slot-row', { hasText: '5th' }).locator('.pip.spent').waitFor()
  await bolt.getByRole('button', { name: 'Lightning Bolt' }).click()
  assert.match(await bolt.locator('.damage-roller button.roll').innerText(), /10d6/)
  await panel.locator('.spell-row', { hasText: /^Fly/ }).first().getByRole('button', { name: 'Cast' }).click()
  const archRow = page.locator('tr.combatant', { hasText: 'Archmage' })
  await archRow.locator('.chip', { hasText: 'Concentrating: Fly' }).waitFor()
  await archRow.locator('.amount-input').fill('30')
  await archRow.locator('.amount-input').press('Enter')
  await panel.locator('.roll-log li', { hasText: 'Con save DC 15' }).waitFor()

  // A hand-added monster gets the quick roller.
  await open('Bandit')
  await panel.getByLabel('To hit').fill('+4')
  await panel.getByLabel('Damage').fill('1d6+2')
  await panel.getByRole('button', { name: /To hit \+4/ }).click()
  await panel.locator('.damage-roller button.roll').click()
  await panel.locator('.damage-roller .roll-result').waitFor()

  // Next turn opens the panel for whichever monster's turn it is. Thorin (initiative 30) goes
  // first; everyone after him is a monster, so the next turn is always a monster's.
  await page.getByRole('button', { name: 'Start combat' }).click()
  await page.locator('tr.combatant.active', { hasText: 'Thorin' }).waitFor()
  await page.getByRole('button', { name: /Next turn/ }).click()
  await page.waitForFunction(() => !document.querySelector('tr.combatant.active')?.textContent?.includes('Thorin'))
  const active = await page.locator('tr.combatant.active button.link').innerText()
  await panel.locator('h2', { hasText: active }).waitFor()
  await shot('combat-with-panel')
}
