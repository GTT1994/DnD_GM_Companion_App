// Condition durations (rounds, start/end of someone's turn, save ends), the saves waiting above the
// tracker (concentration too), monster save buttons, and group saves with damage and conditions.

import { addCombatant, addMonster, assert, moreMenu, pickCondition, select, startCombat } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  await page.goto(base)
  await addMonster(page, base, '2024', 'goblin boss', 2)
  await addMonster(page, base, '2024', 'adult red dragon')
  await page.goto(`${base}/quick-combat`)
  await addCombatant(page, { name: 'Thorin', initiative: 30, hp: 200, ac: 18 })
  await addCombatant(page, { name: 'Jazz', initiative: 25, hp: 200, ac: 14 })
  const row = (name) => page.locator('tbody.combatant', { has: page.locator('.name-cell', { hasText: new RegExp(`^${name}`) }) }).filter({ hasNotText: `${name} 2` })
  const rowExact = (name) => page.locator('tbody.combatant').filter({ has: page.locator('.name-cell button.link, .name-cell', { hasText: name }) })
  // Fixed turn order: Thorin 30, Jazz 25, Goblin Boss 20, Goblin Boss 2 15, Adult Red Dragon 10.
  for (const [name, init] of [['Goblin Boss 2', 15], ['Adult Red Dragon', 10]]) {
    await rowExact(name).locator('.init-input').fill(String(init))
    await rowExact(name).locator('.init-input').press('Enter')
  }
  await row('Goblin Boss').locator('.init-input').fill('20')
  await row('Goblin Boss').locator('.init-input').press('Enter')
  await page.waitForFunction(() => [...document.querySelectorAll('tbody.combatant .name-cell')].map((c) => c.textContent).join('|').match(/Thorin.*Jazz.*Goblin Boss.*Goblin Boss 2.*Adult Red Dragon/))

  await startCombat(page)
  await page.locator('tbody.combatant.active', { hasText: 'Thorin' }).waitFor()

  // Adds a condition with a duration through the row's "+ Condition" form.
  async function addCondition(target, condition, setDuration) {
    await pickCondition(target, condition)
    const popover = target.locator('.condition-popover')
    await setDuration?.(popover)
    await popover.getByRole('button', { name: 'Add' }).click()
  }

  await addCondition(row('Goblin Boss'), 'Restrained', async (p) => {
    await p.getByLabel('Duration').selectOption('rounds')
    await p.getByLabel('Rounds').fill('1')
  })
  await addCondition(rowExact('Goblin Boss 2'), 'Stunned', (p) => p.getByLabel('Duration').selectOption('end'))  // Thorin's next turn
  await addCondition(rowExact('Adult Red Dragon'), 'Frightened', async (p) => {
    await p.getByLabel('Duration').selectOption('start')
    await p.getByLabel('Whose turn').selectOption({ label: "Jazz's next turn" })
  })
  await addCondition(row('Jazz'), 'Paralyzed', async (p) => {
    await p.getByLabel('Duration').selectOption('save')
    await p.getByLabel('Save ability').selectOption('Wis')
    await p.getByLabel('Save DC').fill('15')
  })
  // Chips show a short badge (1 round, ▸ until a turn, S save ends); the full wording is on hover.
  const chip = (target) => target.locator('.chip')
  assert.equal(await chip(row('Goblin Boss')).textContent(), 'Restrained1')
  assert.match(await chip(row('Goblin Boss')).getAttribute('title'), /^Restrained · 1 rd/)
  assert.match(await chip(rowExact('Goblin Boss 2')).getAttribute('title'), /^Stunned · end of Thorin's turn/)
  assert.equal(await chip(rowExact('Goblin Boss 2')).locator('.chip-badge').innerText(), '▸')
  assert.match(await chip(row('Jazz')).getAttribute('title'), /^Paralyzed · Wis 15 ends/)
  assert.equal(await chip(row('Jazz')).locator('.chip-badge').innerText(), 'S')

  // Every row's Dmg button lines up, whatever conditions the rows have, with the panel closed or open.
  const lined = async () => {
    const edges = await page.locator('tbody.combatant button.damage').evaluateAll((bs) => bs.map((b) => Math.round(b.getBoundingClientRect().right)))
    assert.ok(edges.length >= 5 && edges.every((x) => x === edges[0]), `Dmg buttons end at ${edges}`)
  }
  await lined()
  await rowExact('Adult Red Dragon').locator('button.link').click()
  await page.locator('.monster-panel').waitFor()
  await page.waitForTimeout(400)  // the table narrows as the panel slides in
  await lined()
  await shot('combat-rows-with-panel')
  await page.getByRole('button', { name: 'Close panel' }).click()

  const next = () => page.getByRole('button', { name: /Next turn/ }).click()
  const alerts = page.locator('.turn-alerts')

  // Thorin → Jazz: the dragon's fear ends as Jazz's turn starts; Stunned (set this turn) stays.
  await next()
  await alerts.getByText('Adult Red Dragon is no longer Frightened').waitFor()
  assert.equal(await rowExact('Goblin Boss 2').locator('.chip').count(), 1)

  // Jazz → Goblin Boss: Jazz's save is waiting. A PC has no roll button; she fails.
  await next()
  const jazzSave = alerts.locator('.alert-save', { hasText: 'Jazz' })
  assert.match(await jazzSave.innerText(), /Wis save DC 15 to end Paralyzed/)
  assert.equal(await jazzSave.getByRole('button', { name: /^Roll/ }).count(), 0)
  await jazzSave.getByRole('button', { name: 'Failed' }).click()
  await jazzSave.waitFor({ state: 'detached' })
  assert.equal(await row('Jazz').locator('.chip', { hasText: 'Paralyzed' }).count(), 1)

  // Goblin Boss → Goblin Boss 2: Restrained (1 round) ends.
  await next()
  await alerts.getByText('Goblin Boss is no longer Restrained').waitFor()
  // …→ Dragon → Thorin (round 2) → Jazz: Thorin's next turn has ended, so Stunned ends.
  await next()
  await next()
  await next()
  await alerts.getByText('Goblin Boss 2 is no longer Stunned').waitFor()
  await page.locator('.round', { hasText: 'Round 2' }).waitFor()
  await shot('condition-durations')
  await alerts.getByRole('button', { name: 'Dismiss', exact: true }).click()
  // Jazz's save comes back after her turn; dismiss it this time.
  await next()
  await alerts.locator('.alert-save', { hasText: 'Jazz' }).getByRole('button', { name: 'Dismiss save' }).click()

  // The dragon's saving throw buttons.
  await rowExact('Adult Red Dragon').locator('button.link').click()
  const panel = page.locator('.monster-panel')
  await panel.getByRole('button', { name: 'Dex +6' }).click()
  assert.match(await panel.locator('.save-result').innerText(), /^Dex save \d+/)
  await panel.locator('.roll-log li', { hasText: 'Adult Red Dragon · Dex save' }).waitFor()

  // Group save from Fire Breath: filled in, aimed at the party. Thorin saves, Jazz fails.
  const breath = panel.locator('.action-card', { has: page.locator('.action-title strong', { hasText: 'Fire Breath' }) })
  await breath.getByRole('button', { name: 'Group save' }).click()
  const group = page.locator('.group-save')
  assert.equal(await select(group, 'Ability').inputValue(), 'Dex')
  assert.equal(await group.getByLabel('DC').inputValue(), '21')
  assert.ok(await group.locator('.target-chip', { hasText: 'Thorin' }).locator('input').isChecked())
  assert.ok(!(await group.locator('.target-chip', { hasText: 'Adult Red Dragon' }).locator('input').isChecked()))
  await group.getByRole('button', { name: 'Roll saves' }).click()
  assert.equal(await group.getByRole('button', { name: 'Apply' }).isDisabled(), true)  // waiting for the players
  await group.getByRole('group', { name: 'Thorin result' }).getByRole('button', { name: 'Passed' }).click()
  await group.getByRole('group', { name: 'Jazz result' }).getByRole('button', { name: 'Failed' }).click()
  const total = parseInt(await group.locator('.group-damage').innerText())
  await shot('group-save')
  await group.getByRole('button', { name: 'Apply' }).click()
  await row('Thorin').getByText(`${200 - Math.floor(total / 2)} / 200`).waitFor()
  await row('Jazz').getByText(`${200 - total} / 200`).waitFor()
  await panel.locator('.roll-log li', { hasText: /Fire Breath: DC 21 Dex save/ }).waitFor()

  // Group save from the toolbar: every monster fails a DC 30 Wis save and is Frightened for 2 rounds.
  await page.getByRole('button', { name: 'Group save', exact: true }).first().click()
  await select(group, 'Ability').selectOption('Wis')
  await group.getByLabel('DC').fill('30')
  await group.getByRole('button', { name: 'All monsters' }).click()
  await group.getByLabel('Condition on a failed save').selectOption('Frightened')
  await group.getByLabel('Duration').selectOption('rounds')
  await group.getByLabel('Rounds').fill('2')
  await group.getByRole('button', { name: 'Roll saves' }).click()
  assert.equal(await group.locator('.mode-switch button.selected', { hasText: 'Failed' }).count(), 3)
  await group.getByRole('button', { name: 'Apply' }).click()
  await page.waitForFunction(() => document.querySelectorAll('.chip.timed').length >= 3)
  assert.equal(await page.locator('.chip[title^="Frightened · 2 rds"]').count(), 3)

  // Concentration: damage waits for a Con save, which a monster can roll.
  await addCondition(row('Goblin Boss'), 'Concentrating')
  await row('Goblin Boss').locator('.amount-input').fill('4')
  await row('Goblin Boss').locator('.amount-input').press('Enter')
  const conSave = alerts.locator('.alert-save', { hasText: 'Goblin Boss' })
  assert.match(await conSave.innerText(), /Con save DC 10 to keep concentrating/)
  await conSave.getByRole('button', { name: /^Roll Con save/ }).click()
  await conSave.waitFor({ state: 'detached' })
  await row('Goblin Boss').locator('button.link').click()
  await panel.locator('.roll-log li', { hasText: /Goblin Boss (makes|fails) the Con save \(DC 10, rolled/ }).waitFor()

  // End combat clears conditions and waiting saves.
  await moreMenu(page, 'End combat')
  await page.waitForFunction(() => document.querySelectorAll('.chip').length === 0)
  assert.equal(await alerts.count(), 0)
}
