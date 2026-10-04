// The campaign Overview: session plan from the template with tick-boxes, formatted campaign notes,
// party cards, planned encounters with Load into combat, and End session into the session log
// (unticked items carry over). Then the Sessions tab: list, editing a session, deleting it.

import { addPc, assert, createCampaign } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  await page.goto(base)
  await page.getByRole('button', { name: '2014', exact: true }).click()
  const campaignUrl = await createCampaign(page, base, 'Lost Mine')
  await addPc(page, { name: 'Thorin', level: 3, hp: 25, perception: 13 })
  const card = page.locator('.pc-card', { hasText: 'Thorin' })
  assert.match(await card.innerText(), /HP 25 \/ 25[\s\S]*AC 15[\s\S]*Perception 13/)

  // The plan: start from the template, fill in tick-boxes, tick one off.
  const plan = page.getByRole('textbox', { name: 'Session plan' })
  await page.getByRole('button', { name: 'Start from template' }).click()
  assert.deepEqual(await plan.locator('h2').allInnerTexts(), ['Strong start', 'Scenes', 'Secrets & clues', 'NPCs', 'Locations', 'Encounters', 'Treasure'])
  const items = plan.locator('ul[data-type="taskList"] > li')
  // The text of each filled-in tick-box (the template's empty ones are left out).
  const itemTexts = async () => (await plan.locator('ul[data-type="taskList"] > li p').allInnerTexts()).map((t) => t.trim()).filter(Boolean)
  await items.nth(0).locator('p').click()
  await page.keyboard.type('Ambush on the road')
  await items.nth(1).locator('p').click()
  await page.keyboard.type('Cragmaw hideout')
  await page.keyboard.press('Enter')             // a new tick-box in the same list
  await page.keyboard.type('Phandalin')
  await items.nth(0).locator('input[type=checkbox]').check()
  assert.equal(await items.count(), 8)

  // Campaign notes: a heading by typing "## ", then bold with the toolbar.
  const notes = page.getByRole('textbox', { name: 'Campaign notes' })
  await notes.click()
  await page.keyboard.type('## Villains')
  await page.keyboard.press('Enter')
  await page.locator('.notes-section', { hasText: 'Campaign notes' }).getByRole('button', { name: 'Bold (⌘B)' }).click()
  await page.keyboard.type('Glasstaff')
  assert.equal(await notes.locator('h2').innerText(), 'Villains')
  assert.equal(await notes.locator('strong').innerText(), 'Glasstaff')
  await page.waitForFunction(() => document.querySelectorAll('.notes-section .meta').length === 2 && [...document.querySelectorAll('.notes-section .section-header .meta')].every((m) => m.textContent === 'Saved'))

  // Both survive a refresh, tick included.
  await page.reload()
  await plan.locator('h2').first().waitFor()
  assert.equal(await items.nth(0).getAttribute('data-checked'), 'true')
  assert.deepEqual(await itemTexts(), ['Ambush on the road', 'Cragmaw hideout', 'Phandalin'])
  assert.equal(await notes.locator('strong').innerText(), 'Glasstaff')

  // A planned encounter shows on the Overview and loads into combat.
  await page.getByRole('link', { name: 'Encounters', exact: true }).click()
  await page.getByRole('button', { name: '+ New encounter' }).click()
  await page.getByLabel('Name', { exact: true }).fill('Goblin ambush')
  await page.locator('.monster-picker input').fill('goblin')
  await page.locator('.monster-picker .results button').first().click()
  await page.getByText('Saved', { exact: true }).waitFor()
  await page.getByRole('link', { name: 'Overview' }).click()
  const encounter = page.locator('.planned-encounter', { hasText: 'Goblin ambush' })
  assert.equal(await encounter.locator('.meta').first().innerText(), 'Goblin')
  assert.equal(await encounter.locator('.tag').innerText(), 'Easy')  // 2014 difficulty for one level 3 PC
  await shot('overview')
  await encounter.getByRole('button', { name: 'Load into combat' }).click()
  await page.waitForURL(/\/combat$/)
  await page.locator('tbody.combatant', { hasText: 'Goblin' }).waitFor()
  await page.getByRole('link', { name: 'Overview' }).click()
  await page.locator('.planned-encounters').getByText('No planned encounters').waitFor()  // now marked Used

  // End the session.
  await page.getByRole('button', { name: 'End session' }).click()
  const form = page.getByRole('form', { name: 'End session' })
  await page.waitForFunction(() => document.querySelector('.end-session input[type=number]')?.value === '1')  // suggested number
  await form.getByLabel('Title').fill('Goblin trouble')
  await form.getByRole('textbox', { name: 'Recap' }).click()
  await page.keyboard.type('The party fought goblins on the road.')
  await form.getByRole('button', { name: 'Save session' }).click()
  await page.getByText('Session 1 saved to the log.').waitFor()
  // The next plan keeps only the unticked items, under their heading.
  assert.deepEqual(await plan.locator('h2').allInnerTexts(), ['Scenes'])
  assert.deepEqual(await itemTexts(), ['Cragmaw hideout', 'Phandalin'])

  // The session log.
  await page.getByRole('link', { name: 'Sessions', exact: true }).click()
  const row = page.locator('.sessions-table tbody tr')
  assert.match(await row.innerText(), /1\s+.*2\d{3}\s+Goblin trouble\s+The party fought goblins on the road\./)
  await row.getByRole('link', { name: 'Goblin trouble' }).click()
  assert.match(await page.getByRole('textbox', { name: 'Plan' }).innerText(), /Ambush on the road/)  // the plan as it was
  await page.getByLabel('Title').fill('Goblin Arrows')
  await page.getByText('Saved', { exact: true }).waitFor()
  await shot('session')
  await page.getByRole('link', { name: '← Sessions' }).click()
  await page.locator('.sessions-table').getByRole('link', { name: 'Goblin Arrows' }).waitFor()

  // The old Notes address goes to the Overview.
  await page.goto(`${campaignUrl}/notes`)
  await page.waitForURL(campaignUrl)
  await page.getByRole('textbox', { name: 'Session plan' }).waitFor()

  // Deleting the session.
  await page.getByRole('link', { name: 'Sessions', exact: true }).click()
  await page.getByRole('link', { name: 'Goblin Arrows' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByText('No sessions logged yet.').waitFor()
}
