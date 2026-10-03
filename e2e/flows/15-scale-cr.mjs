// Scaling a monster: Scale CR on the Ogre's stat block, the before / after table, the preview,
// saving it as a homebrew copy (opens in the editor) and finding it in Quick Lookup.

import { assert, openMonster } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  await openMonster(page, base, '2014', 'ogre')
  await page.getByRole('button', { name: 'Scale CR' }).click()
  const panel = page.getByRole('region', { name: 'Scale CR' })
  // Starts one step up: CR 3.
  assert.equal(await panel.getByLabel('New CR').inputValue(), '3')
  await panel.getByLabel('New CR').selectOption('5')

  const row = async (label) => (await panel.locator('tr', { has: page.locator('th', { hasText: label }) }).locator('td').allInnerTexts())
  assert.deepEqual(await row('Armor Class'), ['11', '13'])
  assert.deepEqual(await row('Greatclub'), ['+6 to hit, 2d8+4 Bludgeoning', '+9 to hit, 4d8+4 Bludgeoning'])
  assert.deepEqual(await row('CR'), ['2 (450 XP)', '5 (1,800 XP)'])

  // The preview shows the new numbers in the action text.
  await panel.getByText('Preview the full stat block').click()
  await panel.locator('.stat-block', { hasText: '+9 to hit' }).getByText('22 (4d8 + 4)').waitFor()
  await shot('scale-cr')

  // Save → a homebrew copy, opened in the editor.
  await panel.getByRole('button', { name: 'Save as homebrew' }).click()
  await page.waitForURL(/\/homebrew\/monster\/hb-/)
  const name = page.getByRole('group', { name: 'Basics' }).getByLabel('Name')
  await name.waitFor()
  assert.equal(await name.inputValue(), 'Ogre (CR 5)')

  // It's in Quick Lookup as homebrew, and the SRD Ogre is unchanged.
  await openMonster(page, base, '2014', 'ogre (cr 5)')
  assert.equal(await page.locator('.stat-block h2').innerText(), 'Ogre (CR 5)')
  await page.locator('.stat-block .homebrew-tag').waitFor()
  await openMonster(page, base, '2014', 'ogre')
  assert.equal(await page.locator('.stat-block h2').innerText(), 'Ogre')
  await page.locator('.stat-block', { hasText: '+6 to hit' }).waitFor()
}
