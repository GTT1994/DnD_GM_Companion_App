// Homebrew: editor checks, a new spell, a copied-and-edited SRD monster with spellcasting,
// edition tags in Lookup, rolling homebrew in the combat panel, and export/import.

import { assert, openMonster, select } from '../helpers.mjs'

export default async function ({ page, base, shot, shotsDir }) {
  const label = (text) => page.getByLabel(text, { exact: true })

  // A blank monster can't be saved.
  await page.goto(`${base}/homebrew/monster/new`)
  assert.equal(await page.getByRole('button', { name: 'Save monster' }).isDisabled(), true)
  await page.getByText('The monster needs a name.').waitFor()

  // A homebrew spell: 3d10 Fire at 2nd level, +1d10 per level.
  await page.goto(`${base}/homebrew/spell/new`)
  await label('Name').fill('Hellfire Bolt')
  await select(page, 'Level').selectOption('2')
  await select(page, 'Spell attack').selectOption('ranged')
  await page.getByLabel('Damage at 2nd level').fill('3d10')
  await select(page, 'Damage type').selectOption('Fire')
  await page.getByLabel('Extra per level above').fill('lots')  // invalid dice: error shown, can't save, no crash
  await page.locator('.field-error').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Save spell' }).isDisabled(), true)
  await page.getByLabel('Extra per level above').fill('1d10')
  assert.match(await page.locator('.scaling-preview .meta').first().innerText(), /^2nd 3d10 · 3rd 4d10/)
  await page.getByRole('button', { name: 'Save spell' }).click()
  await page.waitForURL(`${base}/homebrew`)

  // Copy the 2024 Goblin Boss and change it.
  await openMonster(page, base, '2024', 'goblin boss')
  await page.getByRole('button', { name: 'Make homebrew copy' }).click()
  await page.waitForURL(/\/homebrew\/monster\/hb-/)
  assert.equal(await label('Name').first().inputValue(), 'Goblin Boss')
  assert.equal(await select(page, 'Edition').first().inputValue(), '2024')
  await label('Name').first().fill('Goblin Warlord')
  await label('Hit points').fill('45')

  const actions = page.locator('fieldset', { has: page.locator('legend', { hasText: /^Actions$/ }) })
  await actions.getByRole('button', { name: '+ Add action' }).click()
  const sword = actions.locator('.feature-editor').last()
  await sword.getByLabel('Name', { exact: true }).fill('Fire Sword')
  await sword.getByLabel('Description').fill('Melee Attack Roll: +6, reach 5 ft. Hit: 7 (1d8 + 3) Slashing damage plus 7 (2d6) Fire damage.')
  await sword.getByLabel('Attack bonus').fill('6')
  await sword.getByRole('button', { name: '+ Damage' }).click()
  await sword.getByLabel('Damage', { exact: true }).fill('1d8+3')
  await sword.getByRole('button', { name: '+ Damage' }).click()
  await sword.getByLabel('Extra damage').fill('2d6')
  await select(sword.locator('.damage-part').nth(1), 'Type').selectOption('Fire')

  await actions.getByRole('button', { name: '+ Add action' }).click()
  const casting = actions.locator('.feature-editor').last()
  await casting.getByLabel('Name', { exact: true }).fill('Spellcasting')
  await casting.getByLabel('Description').fill('The warlord casts one of the following spells (spell save DC 13):')
  await casting.getByLabel('Spellcasting').check()
  for (const name of ['Fireball', 'Hellfire Bolt']) {
    await casting.getByPlaceholder('Add a spell…').fill(name)
    await casting.getByRole('button', { name: 'Add spell' }).click()
  }
  await select(casting.locator('.spell-entry').first(), 'Can cast').selectOption('1')
  await casting.getByRole('button', { name: 'Write spell list into description' }).click()
  assert.match(await casting.getByLabel('Description').inputValue(), /- \*\*1\/Day:\*\* Fireball/)
  assert.equal(await page.locator('.editor-preview h2').innerText(), 'Goblin Warlord')
  await shot('monster-editor')
  await page.getByRole('button', { name: 'Save monster' }).click()
  await page.waitForURL(`${base}/homebrew`)
  assert.deepEqual(await page.locator('.homebrew-lists .name-cell').allInnerTexts(), ['Goblin Warlord', 'Hellfire Bolt'])

  // Tagged 2024: shows in 2024 Lookup only.
  await openMonster(page, base, '2024', 'warlord')
  assert.match(await page.locator('.results button').first().innerText(), /Homebrew/)
  await page.getByRole('button', { name: 'Add to combat' }).click()
  await page.getByText(/^Added 1/).waitFor()
  await page.getByRole('button', { name: '2014', exact: true }).click()
  await page.locator('.results', { hasText: 'No matches.' }).waitFor()
  await page.getByRole('button', { name: '2024', exact: true }).click()

  // Roll the homebrew attack and spell in combat.
  await page.goto(`${base}/quick-combat`)
  await page.locator('tr.combatant', { hasText: 'Goblin Warlord' }).locator('button.link').click()
  const panel = page.locator('.monster-panel')
  const swordCard = panel.locator('.action-card', { has: page.locator('.action-title strong', { hasText: 'Fire Sword' }) })
  await swordCard.locator('.damage-parts input').first().waitFor()  // wait for the panel to draw
  assert.deepEqual(await swordCard.locator('.damage-parts input').evaluateAll((els) => els.map((e) => e.checked)), [true, true])
  await swordCard.locator('.damage-roller button.roll').click()
  await swordCard.locator('.damage-roller .roll-result').waitFor()
  const boltRow = panel.locator('.spell-row', { hasText: 'Hellfire Bolt' })
  await boltRow.getByRole('button', { name: 'Hellfire Bolt' }).click()
  assert.equal(await boltRow.getByRole('button', { name: /To hit/ }).innerText(), 'To hit +5')  // DC 13 − 8
  assert.match(await boltRow.locator('.damage-roller button.roll').innerText(), /3d10/)
  const fireball = panel.locator('.spell-row', { hasText: 'Fireball' })
  await fireball.getByRole('button', { name: 'Cast' }).click()
  await page.waitForFunction(() => [...document.querySelectorAll('.spell-row')].find((r) => r.textContent.includes('Fireball'))?.querySelector('button.small')?.disabled)

  // Export; re-importing adds nothing; deleting then importing restores the spell.
  await page.goto(`${base}/homebrew`)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export', exact: true }).click()])
  const file = `${shotsDir}homebrew-backup.json`
  await download.saveAs(file)
  await page.locator('input[type=file]').setInputFiles(file)
  await page.getByText(/nothing new/).waitFor()
  await page.locator('tr', { hasText: 'Hellfire Bolt' }).getByRole('button', { name: 'Delete' }).click()
  await page.locator('input[type=file]').setInputFiles(file)
  await page.getByText('Imported 1 homebrew spell.').waitFor()
  assert.deepEqual(await page.locator('.homebrew-lists .name-cell').allInnerTexts(), ['Goblin Warlord', 'Hellfire Bolt'])
}
