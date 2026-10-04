// Resistances, immunities and vulnerabilities: a PC's fire resistance from the PC form, a 2014
// Earth Elemental's tags and typed damage (nonmagical resistance, Magical tick-box, vulnerability),
// the condition immunity warning, a temporary resistance, and group saves adjusted per target.

import { addMonster, assert, createCampaign, pickCondition, rowMenu, select, startCombat } from '../helpers.mjs'

export default async function ({ page, base, shot }) {
  const campaignUrl = await createCampaign(page, base, 'Elements')

  // Thorin resists fire.
  await page.getByRole('button', { name: '+ Add PC' }).click()
  await page.getByLabel('Character name', { exact: true }).fill('Thorin')
  await page.getByLabel('AC', { exact: true }).fill('18')
  await page.getByLabel('Max HP', { exact: true }).fill('60')
  await page.getByText('Resistances, immunities and vulnerabilities').click()
  await page.getByLabel('Resistant to Fire').check()
  await page.getByRole('button', { name: 'Add to party' }).click()
  await page.locator('.pc-card .defense-tag', { hasText: 'Res fire' }).waitFor()

  await addMonster(page, campaignUrl, '2014', 'earth elemental')
  await addMonster(page, campaignUrl, '2024', 'red dragon wyrmling')
  await page.goto(`${campaignUrl}/combat`)
  await page.getByRole('button', { name: 'Add party' }).click()
  await page.locator('tbody.combatant').nth(2).waitFor()

  // The elemental's tags; * marks "nonmagical only".
  const elemental = page.locator('tbody.combatant', { hasText: 'Earth Elemental' })
  assert.deepEqual(await elemental.locator('.defense-tag').allInnerTexts(), ['Res bludgeoning*, piercing*, slashing*', 'Imm poison', 'Vuln thunder'])
  const hp = async () => (await elemental.locator('.hp-text').innerText()).match(/^(\d+)/)[1]

  // Typed damage: 20 nonmagical slashing is halved; with Magical ticked it isn't; thunder doubles.
  async function hit(amount, type, magical = false) {
    await elemental.locator('.amount-input').fill(String(amount))
    // The damage type is in the row's ⋯ menu; clicking back in the HP box closes it.
    const menu = await rowMenu(elemental)
    await menu.getByLabel('Damage type for Earth Elemental').selectOption(type)
    if (magical) await menu.getByLabel('Magical').check()
    if (magical) await shot('row-menu')
    await elemental.locator('.amount-input').click()
    await menu.waitFor({ state: 'detached' })
  }
  await hit(20, 'Slashing')
  assert.equal(await elemental.locator('button.damage').innerText(), 'Dmg 10 (½ slashing)')
  assert.equal(await elemental.locator('.type-tag').innerText(), 'slashing ✕')  // shown beside the HP box
  await elemental.locator('button.damage').click()
  await elemental.getByText('116 / 126').waitFor()
  await hit(10, 'Slashing', true)
  assert.equal(await elemental.locator('button.damage').innerText(), 'Dmg')  // magical: no change
  await elemental.locator('button.damage').click()
  await elemental.getByText('106 / 126').waitFor()
  await hit(5, 'Thunder')
  await elemental.locator('.amount-input').press('Enter')
  await elemental.getByText('96 / 126').waitFor()
  assert.equal(await elemental.locator('.type-tag').count(), 0, 'type resets after each hit')
  assert.equal(await hp(), '96')

  // Poisoned: the elemental is immune, so there's a warning.
  await pickCondition(elemental, 'Poisoned')
  await elemental.locator('.condition-popover .field-error', { hasText: 'immune to Poisoned' }).waitFor()
  await elemental.locator('.condition-popover').getByRole('button', { name: 'Cancel' }).click()

  // A temporary resistance on Thorin (e.g. Absorb Elements).
  const thorin = page.locator('tbody.combatant', { hasText: 'Thorin' })
  await pickCondition(thorin, { label: 'Resistant…' })
  await thorin.locator('.condition-popover').getByLabel('Damage type').selectOption('Cold')
  await thorin.locator('.condition-popover').getByRole('button', { name: 'Add' }).click()
  await thorin.locator('.chip', { hasText: 'Res: Cold' }).waitFor()
  assert.equal(await thorin.locator('.defense-tag').innerText(), 'Res fire, cold')
  await shot('resistances')

  // The wyrmling's Fire Breath at Thorin: he fails, but resists fire, so takes half.
  await startCombat(page)
  // Its panel may already be open if it won initiative (the panel follows the turn).
  if (!(await page.locator('.monster-panel h2', { hasText: 'Red Dragon Wyrmling' }).count())) {
    await page.locator('tbody.combatant', { hasText: 'Red Dragon Wyrmling' }).locator('button.link').click()
  }
  const breath = page.locator('.monster-panel .action-card', { has: page.locator('.action-title strong', { hasText: 'Fire Breath' }) })
  await breath.getByRole('button', { name: 'Group save' }).click()
  const group = page.locator('.group-save')
  assert.equal(await select(group, 'Damage type').inputValue(), 'Fire')
  await group.getByRole('button', { name: 'Roll saves' }).click()
  await group.getByRole('group', { name: 'Thorin result' }).getByRole('button', { name: 'Failed' }).click()
  const total = parseInt(await group.locator('.group-damage').innerText())
  assert.equal(await group.locator('.group-amount').innerText(), `${Math.floor(total / 2)} dmg (½ fire)`)
  await group.getByRole('button', { name: 'Apply' }).click()
  await thorin.getByText(`${60 - Math.floor(total / 2)} / 60`).waitFor()

  // A group save at both monsters: 20 fire (the wyrmling is immune), and Paralyzed on a failure
  // (the elemental is immune to that).
  await page.getByRole('button', { name: 'Group save', exact: true }).first().click()
  await group.getByLabel('DC').fill('30')
  await group.getByRole('button', { name: 'All monsters' }).click()
  await group.getByLabel(/^Damage \(optional\)/).fill('20')
  await select(group, 'Damage type').selectOption('Fire')
  await group.getByLabel('Condition on a failed save').selectOption('Paralyzed')
  await group.getByRole('button', { name: 'Roll saves' }).click()
  const rowFor = (name) => group.locator('.group-save-results tr', { hasText: name })
  assert.equal(await rowFor('Wyrmling').locator('.group-amount').innerText(), '0 dmg (immune)')
  assert.match(await rowFor('Earth Elemental').locator('.group-amount').innerText(), /^20 dmg · immune to Paralyzed$/)
  await group.getByRole('button', { name: 'Apply' }).click()
  await elemental.getByText('76 / 126').waitFor()
  await page.locator('tbody.combatant', { hasText: 'Red Dragon Wyrmling' }).locator('.chip', { hasText: 'Paralyzed' }).waitFor()
  assert.equal(await elemental.locator('.chip', { hasText: 'Paralyzed' }).count(), 0)
}
