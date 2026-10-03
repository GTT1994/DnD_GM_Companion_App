// Lairs and mob attacks: a lair typed in for the fight (initiative 20, losing ties), its panel on
// its turn, the same lair action blocked the next round; four goblins mob-attacking a PC; and an
// "In its lair" monster getting 4 uses of Legendary Resistance.

import { addCombatant, addMonster, assert, moreMenu, startCombat, trackerRows } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  await addMonster(page, base, '2014', 'goblin', 4)
  await page.goto(`${base}/quick-combat`)
  await addCombatant(page, { name: 'Thorin', initiative: 20, hp: 40, ac: 13 })
  await page.getByRole('button', { name: 'Close add combatant' }).click()

  // A lair with two actions; it goes after Thorin, who also has 20.
  await moreMenu(page, 'Add lair')
  const form = page.getByRole('region', { name: 'Add lair' })
  await form.getByLabel('Name').fill('Goblin cave')
  await form.getByLabel(/Lair actions/).fill('Rocks fall from the ceiling\nSmoke fills the tunnel')
  await form.getByRole('button', { name: 'Add lair', exact: true }).click()
  await page.locator('tr.lair', { hasText: 'Goblin cave' }).waitFor()
  const names = (await trackerRows(page)).map((r) => r.name)
  assert.equal(names.indexOf('Goblin cave'), names.indexOf('Thorin') + 1)

  // Go to the lair's turn: its panel opens with its actions.
  await startCombat(page)
  const panel = page.locator('.lair-panel')
  const turnOf = async (name, round) => {
    for (let i = 0; i < 12; i++) {
      const text = await page.locator('.round').textContent()
      if (text.includes(`Round ${round}`) && text.includes(`${name}'s turn`)) return
      await page.getByRole('button', { name: 'Next turn ▶' }).click()
      // Wait for the turn to move before reading it again.
      await page.waitForFunction((old) => document.querySelector('.round')?.textContent !== old, text)
    }
    throw new Error(`never reached ${name} in round ${round}`)
  }
  await turnOf('Goblin cave', 1)
  await panel.waitFor()
  const action = (text) => panel.locator('.lair-action', { hasText: text })
  await action('Rocks fall').getByRole('button', { name: 'Use' }).click()
  await action('Rocks fall').getByRole('button', { name: '✓ Used this round' }).waitFor()
  assert.match(await page.locator('tr.lair .lair-summary').innerText(), /round 1\): Rocks fall/)
  await shot('lair-panel')

  // Next round the same action can't be used, the other can.
  await turnOf('Goblin cave', 2)
  await action('Rocks fall').getByText('Used last round').waitFor()
  assert.equal(await action('Rocks fall').getByRole('button', { name: 'Use' }).count(), 0)
  await action('Smoke').getByRole('button', { name: 'Use' }).click()

  // Mob attack: 4 goblins (+4 to hit) against AC 13 need a 9 → 1 hit per 2 → 2 hits.
  await page.locator('tr.combatant .name-cell button', { hasText: /^Goblin$/ }).click()
  const scimitar = page.locator('.monster-panel .action-card', { hasText: 'Scimitar' })
  await scimitar.getByRole('button', { name: 'Mob attack' }).click()
  const mob = scimitar.locator('.mob-attack')
  assert.equal(await mob.getByLabel('Attackers').inputValue(), '4')
  assert.match(await mob.locator('.mob-odds').innerText(), /Needs 9\+ on the d20 → 1 hit per 2 attackers → 2 hits/)
  await mob.getByRole('button', { name: 'Roll mob damage' }).click()
  const damage = Number(await mob.locator('.roll-result strong').innerText())
  assert.ok(damage >= 6 && damage <= 16, `2 × 1d6+2 rolled ${damage}`)
  await mob.getByRole('button', { name: /^Apply \d+ to Thorin/ }).click()
  await page.locator('.roll-log li', { hasText: `4 × Goblin mob-attack Thorin (Scimitar): 2 hits, ${damage} damage` }).waitFor()
  const thorin = (await trackerRows(page)).find((r) => r.name === 'Thorin')
  assert.match(thorin.hp, new RegExp(`^${40 - damage}\\s*/\\s*40`))
  await shot('mob-attack')

  // In its lair, a 2024 adult dragon gets 4 Legendary Resistance uses instead of 3.
  await addMonster(page, base, '2024', 'adult red dragon')
  await page.goto(`${base}/quick-combat`)
  await page.locator('tr.combatant .name-cell button', { hasText: 'Adult Red Dragon' }).click()
  const pips = page.locator('.monster-panel .pips[aria-label^="Legendary Resistance"]')
  await page.locator('.monster-panel details.traits summary').click()
  assert.equal(await pips.locator('.pip').count(), 3)
  // The box ticks once the change is saved, so click and wait for the fourth pip.
  await page.getByLabel(/In its lair/).click()
  await pips.locator('.pip').nth(3).waitFor()
  assert.equal(await page.getByLabel(/In its lair/).isChecked(), true)
}
