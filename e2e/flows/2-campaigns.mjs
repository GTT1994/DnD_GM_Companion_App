// Campaigns: moving an old saved fight into Quick combat, party, HP carry-over, long rest,
// saved NPCs, notes, export/import and delete.

import { writeFile } from 'node:fs/promises'
import { addPc, assert, createCampaign } from '../helpers.mjs'

export default async function ({ page, base, shot, shotsDir }) {
  // A fight saved by the very first version of the app (localStorage) moves into Quick combat.
  await page.goto(base)
  await page.evaluate(() => localStorage.setItem('gm-companion:combat', JSON.stringify({
    combatants: [{ id: 'x1', name: 'Old Orc', hp: 15, maxHp: 15, tempHp: 0, ac: 13, initiative: 12, isPlayer: false, conditions: [] }],
    round: 2, activeId: 'x1',
  })))
  await page.reload()
  await page.getByText('1 combatant, round 2').waitFor()
  assert.equal(await page.evaluate(() => localStorage.getItem('gm-companion:combat')), null)

  await createCampaign(page, base, 'Curse of Strahd')
  await addPc(page, { name: 'Thorin', hp: 44, perception: 13 })
  await addPc(page, { name: 'Jazz', hp: 31, perception: 16 })

  // Add party, take damage, see it on the Overview.
  await page.getByRole('link', { name: 'Combat', exact: true }).click()
  await page.getByRole('button', { name: 'Add party' }).click()
  await page.locator('tr.combatant').nth(1).waitFor()
  await page.getByRole('button', { name: '+ Add combatant' }).click()  // closed now the party is in the fight
  assert.equal(await page.locator('.add-form input[type=checkbox]').isChecked(), false, 'Player should start unticked in a campaign')
  await page.getByRole('button', { name: 'Close add combatant' }).click()
  const thorin = page.locator('tr.combatant', { hasText: 'Thorin' })
  await thorin.locator('.amount-input').fill('10')
  await thorin.locator('.amount-input').press('Enter')
  await thorin.getByText('34 / 44').waitFor()
  await page.getByRole('link', { name: 'Overview' }).click()
  await page.locator('.data-table tr', { hasText: 'Thorin' }).getByText('34 / 44').waitFor()
  await shot('campaign-overview')
  await page.getByRole('button', { name: 'Long rest' }).click()
  await page.locator('.data-table tr', { hasText: 'Thorin' }).getByText('44 / 44').waitFor()

  // Save a generated NPC with notes.
  await page.getByRole('link', { name: 'Generators' }).click()
  await page.getByRole('button', { name: 'Generate NPC' }).click()
  const npcName = await page.locator('.card h3').first().innerText()
  await page.getByRole('button', { name: 'Save to campaign' }).first().click()
  await page.getByText('Saved ✓').waitFor()
  await page.locator('.notice').getByRole('link', { name: 'Open' }).click()
  assert.equal(await page.locator('.npc-view-header h2').innerText(), npcName)
  await page.getByLabel('Notes', { exact: true }).fill('Met at the tavern')
  await page.getByText('Saved', { exact: true }).waitFor()
  await page.getByRole('link', { name: '← NPCs' }).click()
  assert.equal(await page.locator('.npc-table .name-cell').innerText(), npcName)

  // Notes save as you type and survive a refresh.
  await page.getByRole('link', { name: 'Notes' }).click()
  await page.locator('textarea.notes').fill('Strahd wants Ireena.')
  await page.getByText('Saved', { exact: true }).waitFor()
  await page.reload()
  assert.equal(await page.locator('textarea.notes').inputValue(), 'Strahd wants Ireena.')

  // Export, import a copy, delete the copy.
  await page.getByRole('link', { name: 'GM Companion' }).click()
  await page.locator('.campaign-card').first().waitFor()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export', exact: true }).click()])
  const file = `${shotsDir}campaign-backup.json`
  await download.saveAs(file)
  await page.locator('input[type=file]').setInputFiles(file)
  await page.getByText('Imported 1 campaign.').waitFor()
  assert.equal(await page.locator('.campaign-card').count(), 2)
  await page.locator('.campaign-card').nth(1).getByRole('button', { name: 'Delete' }).click()
  await page.waitForFunction(() => document.querySelectorAll('.campaign-card').length === 1)

  // A file that isn't a backup is rejected.
  await writeFile(`${shotsDir}not-a-backup.json`, '{"hello":1}')
  await page.locator('input[type=file]').setInputFiles(`${shotsDir}not-a-backup.json`)
  await page.getByText('This file is not a GM Companion backup.').waitFor()

  // A deleted campaign's address shows a friendly message.
  await page.goto(`${base}/campaign/does-not-exist/combat`)
  await page.getByText("This campaign doesn't exist").waitFor()
}
