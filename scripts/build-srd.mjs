// Downloads the SRD rules data (2014 and 2024 editions: monsters, spells, conditions, magic items,
// equipment and, for 2014, rules sections) from the 5e-bits/5e-database
// project (plus Open5e's SRD 5.2 text for 2024 magic item tables) and trims it down to the fields the app uses, writing one JSON file per
// category to src/data/srd/<edition>/. Run with: npm run srd

import { mkdir, readFile, writeFile } from 'node:fs/promises'

const SOURCE = 'https://raw.githubusercontent.com/5e-bits/5e-database/main/src'
const OUT_DIR = new URL('../src/data/srd/', import.meta.url)

// Fetches one source file, e.g. load('2014', 'Monsters').
async function load(edition, name) {
  const res = await fetch(`${SOURCE}/${edition}/en/5e-SRD-${name}.json`)
  if (!res.ok) throw new Error(`Failed to download ${edition} ${name}: ${res.status}`)
  return res.json()
}

// Some text fields are arrays of paragraphs in 2014 and single strings in 2024.
function toText(value, separator = '\n\n') {
  if (value == null) return undefined
  return Array.isArray(value) ? value.join(separator) : value
}

// "1 action" (2014) and "Action" (2024) both shown as written, with the first letter capitalised.
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1)

const signed = (n) => (n >= 0 ? `+${n}` : `${n}`)

// --- Monsters ---------------------------------------------------------------

// Turns a usage object into the usual stat block suffix, e.g. "Recharge 5–6" or "3/Day".
function usageLabel(usage) {
  if (!usage) return ''
  if (usage.type === 'recharge on roll') {
    return usage.min_value === 6 ? 'Recharge 6' : `Recharge ${usage.min_value}–6`
  }
  if (usage.type === 'per day') {
    return usage.times_in_lair
      ? `${usage.times}/Day, or ${usage.times_in_lair}/Day in Lair`
      : `${usage.times}/Day`
  }
  if (usage.type === 'recharge after rest') {
    return `Recharges after a ${usage.rest_types.map(capitalise).join(' or ')} Rest`
  }
  return ''
}

// Builds a Markdown spell list from structured spellcasting data, grouped the way
// 2024 stat blocks show it, e.g. "- **At Will:** Light, Mage Hand" / "- **1/Day Each:** Fireball".
function spellList(spells) {
  const groups = new Map()  // label → spell names, in the order they first appear
  for (const s of spells) {
    const label = s.usage?.type === 'at will' ? 'At Will'
      : s.usage?.type === 'per day' ? `${s.usage.times}/Day`
      : 'Spells'
    const name = s.notes ? `${s.name} (${s.notes.charAt(0).toLowerCase()}${s.notes.slice(1)})` : s.name
    groups.set(label, [...(groups.get(label) ?? []), name])
  }
  // At Will first, then the most uses per day first (3/Day before 1/Day).
  const order = (label) => (label === 'At Will' ? -100 : -parseInt(label) || 0)
  return [...groups]
    .sort(([a], [b]) => order(a) - order(b))
    .map(([label, names]) => `- **${label}${names.length > 1 && label.includes('/Day') ? ' Each' : ''}:** ${names.join(', ')}`)
    .join('\n')
}

// How often a trait or action can be used, in the app's own shape (for tracking uses in combat).
function usageOf(usage) {
  if (usage?.type === 'recharge on roll') return { type: 'recharge', min: usage.min_value }
  if (usage?.type === 'per day') return { type: 'perDay', times: usage.times }
  if (usage?.type === 'recharge after rest') return { type: 'rest' }
  return undefined
}

// Damage parts as { dice, type, note? }. A choice of damage (e.g. one- or two-handed) becomes
// one part per option, marked as alternatives.
function damageParts(damage) {
  const parts = []
  for (const d of damage ?? []) {
    if (d.damage_dice) parts.push({ dice: d.damage_dice, type: d.damage_type?.name ?? '' })
    for (const option of d.from?.options ?? []) {
      if (option.damage_dice) {
        parts.push({ dice: option.damage_dice, type: option.damage_type?.name ?? '', note: option.notes, alternative: true })
      }
    }
  }
  return parts.length ? parts : undefined
}

// A monster's spellcasting: DC, attack bonus, caster level, slots, and spells with how often they can be cast.
function spellcastingOf(sc) {
  if (!sc) return undefined
  return {
    ability: sc.ability?.name,
    dc: sc.dc,
    attack: sc.modifier,           // 2014 only; the app uses DC − 8 when missing
    level: sc.level,               // 2014 only, used to scale cantrips
    slots: sc.slots,               // 2014 only: spell level → number of slots
    spells: sc.spells.map((s) => ({
      index: s.index ?? s.url.split('/').pop(),
      name: s.name,
      level: s.level,
      // 'atWill', a number of uses per day, or undefined (uses a slot, or limited by the trait itself)
      usage: s.usage?.type === 'at will' ? 'atWill' : s.usage?.type === 'per day' ? s.usage.times : undefined,
      notes: s.notes,
    })),
  }
}

// Keeps the name and description of each trait or action, plus the numbers needed to roll it.
function abilities(list) {
  if (!list?.length) return undefined
  return list.map((a) => {
    const usage = usageLabel(a.usage)
    // A "* note" footnote line (2014 spell lists) would show as a bullet point: keep its * and put it on its own line.
    let desc = a.desc.replace(/\n\* /g, '\n\n\\* ')
    // 2024 spellcasting text ends "...casts one of the following spells:" with the list stored separately.
    if (a.spellcasting?.spells?.length && desc.trimEnd().endsWith(':')) {
      desc = `${desc.trimEnd()}\n\n${spellList(a.spellcasting.spells)}`
    }
    return {
      name: usage ? `${a.name} (${usage})` : a.name,
      desc,
      attack: a.attack_bonus,
      damage: damageParts(a.damage),
      dc: a.dc?.dc_value ? { ability: a.dc.dc_type.name, value: a.dc.dc_value, success: a.dc.success_type } : undefined,
      usage: usageOf(a.usage),
      spellcasting: spellcastingOf(a.spellcasting),
    }
  })
}

// Builds "Con +6, Int +8" (saves) or "History +12, Perception +10" (skills) from the proficiency list.
function proficiencyList(proficiencies, prefix) {
  const items = proficiencies
    .filter((p) => p.proficiency.name.startsWith(prefix))
    .map((p) => {
      const name = p.proficiency.name.slice(prefix.length)
      const label = prefix === 'Saving Throw: ' ? capitalise(name.toLowerCase()) : name
      return `${label} ${signed(p.value)}`
    })
  return items.length ? items.join(', ') : undefined
}

function speedText(speed) {
  return Object.entries(speed)
    .map(([kind, value]) => {
      if (kind === 'hover') return value ? '(hover)' : ''
      return kind === 'walk' ? value : `${kind} ${value}`
    })
    .filter(Boolean)
    .join(', ')
}

function sensesText(senses) {
  return Object.entries(senses)
    .map(([kind, value]) => (kind === 'passive_perception' ? `passive Perception ${value}` : `${kind} ${value}`))
    .join(', ')
}

function listText(list) {
  if (!list?.length) return undefined
  return list.map((x) => (typeof x === 'string' ? x : x.name)).join(', ')
}

function monster(m) {
  const ac = m.armor_class[0]
  // Notes such as "natural armor" or the armour worn, shown in brackets after the AC.
  const acNote = ac.armor?.map((a) => a.name).join(', ') ?? (ac.type && ac.type !== 'dex' ? `${ac.type} armor` : undefined)
  return {
    index: m.index,
    name: m.name,
    meta: [m.size, m.subtype ? `${m.type} (${m.subtype})` : m.type, m.alignment].filter(Boolean).join(', '),
    ac: ac.value,
    acNote,
    hp: m.hit_points,
    hitDice: m.hit_points_roll ?? m.hit_dice,
    speed: speedText(m.speed),
    abilities: [m.strength, m.dexterity, m.constitution, m.intelligence, m.wisdom, m.charisma],
    saves: proficiencyList(m.proficiencies ?? [], 'Saving Throw: '),
    skills: proficiencyList(m.proficiencies ?? [], 'Skill: '),
    vulnerabilities: listText(m.damage_vulnerabilities),
    resistances: listText(m.damage_resistances),
    immunities: listText(m.damage_immunities),
    conditionImmunities: listText(m.condition_immunities),
    senses: sensesText(m.senses),
    languages: m.languages || undefined,
    cr: m.challenge_rating,
    xp: m.xp,
    traits: abilities(m.special_abilities),
    actions: abilities(m.actions),
    bonusActions: abilities(m.bonus_actions),
    reactions: abilities(m.reactions),
    legendaryActions: abilities(m.legendary_actions),
  }
}

// --- Spells -----------------------------------------------------------------

const ABILITY_ABBREVIATIONS = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' }

// Which saving throw a spell asks for, and whether a success halves the damage.
// 2014 stores this; for 2024 it's read from the description, e.g. "makes a Dexterity saving throw".
function spellSave(s, desc) {
  if (s.attack_type) return {}
  if (s.dc) return { saveAbility: s.dc.dc_type.name, saveSuccess: s.dc.dc_success }
  const match = desc.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/i)
  if (!match) return {}
  return {
    saveAbility: ABILITY_ABBREVIATIONS[match[1].toLowerCase()],
    saveSuccess: /half as much damage|half damage/i.test(desc) ? 'half' : 'none',
  }
}

function spell(s) {
  const components = s.components.join(', ') + (s.material ? ` (${s.material})` : '')
  const desc = toText(s.desc ?? s.description)
  const damage = Array.isArray(s.damage) ? s.damage[0] : s.damage  // a list in 2014, one object in 2024
  return {
    index: s.index,
    name: s.name,
    level: s.level,
    school: s.school.name,
    castingTime: capitalise(s.casting_time),
    range: s.range,
    components,
    duration: s.duration,
    concentration: s.concentration,
    ritual: s.ritual,
    desc,
    higherLevel: toText(s.higher_level),
    classes: s.classes.map((c) => c.name),
    attackType: s.attack_type,                          // 'melee' or 'ranged' for spell attacks
    damageType: damage?.damage_type?.name,
    damageBySlot: damage?.damage_at_slot_level,         // slot level → dice, e.g. { 3: '8d6', 4: '9d6' }
    damageByLevel: damage?.damage_at_character_level,   // cantrips: caster level → dice
    healBySlot: s.heal_at_slot_level,                   // slot level → dice, may include "MOD"
    ...spellSave(s, desc),
  }
}

// --- Conditions, magic items and rules --------------------------------------

function condition(c) {
  // 2014 gives a list of "- ..." lines; 2024 gives one string with single line breaks.
  const desc = Array.isArray(c.desc) ? c.desc.join('\n') : c.description.replace(/\n/g, '\n\n')
  return { index: c.index, name: c.name, desc }
}

// "Uncommon (+1)" → { rarity: 'Uncommon', rarityNote: '+1' }; "Rare (Brass)" → Rare, Brass.
// The loot and shop generators match on the plain rarity.
function splitRarity(name) {
  const match = name.match(/^(Common|Uncommon|Rare|Very Rare|Legendary|Artifact)\s*\((.+)\)$/i)
  if (match) return { rarity: match[1], rarityNote: match[2] }
  return { rarity: name === 'Rarity Varies' ? 'Varies' : name }
}

function magicItem(item) {
  const desc = toText(item.desc)
  return {
    index: item.index,
    name: item.name,
    ...splitRarity(item.rarity.name),
    category: item.equipment_category.name,
    attunement: item.attunement ?? /requires attunement/i.test(desc),
    desc,
  }
}

// --- 2024 magic item tables ---------------------------------------------------------------
// In the 2024 data, magic item tables lost their layout (cells run together, rows missing). Open5e
// publishes the same SRD 5.2 text (also CC-BY-4.0) with the tables intact, so for any 2024 item that
// mentions a table, its description is taken from Open5e instead. A few items Open5e doesn't have
// are corrected by hand in scripts/fixes/2024-magic-items.json.

const OPEN5E = 'https://api.open5e.com/v2/magicitems/?format=json&document=srd-2024&limit=1000'
const HAND_FIXES = JSON.parse(await readFile(new URL('./fixes/2024-magic-items.json', import.meta.url), 'utf8'))

// Does this description refer to a table (which will have been broken)?
const mentionsTable = (desc) => /\btable\b/i.test(desc) || /\d{2}[-–]\d{2}\s/.test(desc)
const hasMarkdownTable = (desc) => /\n\|.*\|/.test(desc)

// Open5e sometimes splits an item into versions (e.g. one entry per armour type); any version has the table.
function findOpen5e(open5e, item) {
  const key = (k) => k.replace('srd-2024_', '')
  const candidates = [
    ...open5e.filter((r) => r.name.toLowerCase() === item.name.toLowerCase() || key(r.key) === item.index),
    ...open5e.filter((r) => key(r.key) === item.index.replace(/-\d+$/, '')),          // horn-of-valhalla-2 → horn-of-valhalla
    ...open5e.filter((r) => key(r.key).startsWith(`${item.index}-`)),                // armor-of-resistance-breastplate
    ...open5e.filter((r) => item.index === 'ammunition-of-slaying' && /^ammunition-of-.+-slaying$/.test(key(r.key))),
  ]
  return candidates.find((r) => hasMarkdownTable(r.desc))
}

async function fixTables2024(items) {
  const res = await fetch(OPEN5E)
  if (!res.ok) throw new Error(`Failed to download Open5e magic items: ${res.status}`)
  const open5e = (await res.json()).results
  const unfixed = []
  for (const item of items) {
    if (!mentionsTable(item.desc)) continue
    const hand = HAND_FIXES[item.index]
    if (typeof hand === 'string') {
      item.desc = hand
    } else if (hand) {
      // Keep the text around the table, swapping in the table itself.
      const before = item.desc.slice(0, item.desc.indexOf(hand.after) + hand.after.length)
      item.desc = `${before}\n\n${hand.table}\n\n${item.desc.slice(item.desc.indexOf(hand.resume))}`
    } else {
      const match = findOpen5e(open5e, item)
      if (!match) {
        unfixed.push(item.name)
        continue
      }
      // Keep the 2024 data's first line (e.g. "Armor (Any Medium or Heavy)"), then Open5e's text.
      const firstLine = item.desc.split('\n')[0].trim()
      item.desc = firstLine.length < 80 && !match.desc.startsWith(firstLine) ? `${firstLine}\n\n${match.desc}` : match.desc
    }
  }
  // Tells you when a data update brings a new broken table that needs a fix.
  if (unfixed.length) console.warn(`⚠ 2024 magic items mentioning a table with no fix: ${unfixed.join(', ')}`)
  return items
}

// --- Equipment (for Quick Lookup and the shop generator) ----------------------

// The value of a cost in gold pieces, e.g. { quantity: 5, unit: 'sp' } → 0.5.
const GP = { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 10 }

// One main category for both editions (2024 lists several, from specific to general).
function equipmentCategory(item) {
  const names = item.equipment_category ? [item.equipment_category.name] : (item.equipment_categories ?? []).map((c) => c.name)
  if (names.some((n) => /weapon/i.test(n)) && item.damage) return 'Weapon'
  if (names.some((n) => /^armor$/i.test(n))) return 'Armor'
  if (names.some((n) => /tools/i.test(n))) return 'Tools'
  if (names.some((n) => /mounts|vehicles/i.test(n))) return 'Mounts and Vehicles'
  if (names.some((n) => /ammunition/i.test(n)) || item.gear_category?.index === 'ammunition') return 'Ammunition'
  return 'Adventuring Gear'
}

// The more specific kind, e.g. "Martial Melee", "Heavy", "Artisan's Tools".
function equipmentDetail(item) {
  if (item.category_range) return item.category_range
  if (item.armor_category) return item.armor_category
  if (item.tool_category) return item.tool_category
  if (item.vehicle_category) return item.vehicle_category
  if (item.gear_category && item.gear_category.index !== 'standard-gear') return item.gear_category.name
  const names = (item.equipment_categories ?? []).map((c) => c.name)
  return names.find((n) => /martial|simple|light|medium|heavy|shield|artisan|musical|gaming|foci|holy|packs/i.test(n))?.replace(/ (Weapons|Armor)$/, '')
}

// Armour class as written in the rules, e.g. "16", "11 + Dex", "12 + Dex (max 2)", "+2".
function armorClass(ac) {
  if (!ac) return undefined
  if (!ac.dex_bonus) return ac.base < 10 ? `+${ac.base}` : String(ac.base)
  return ac.max_bonus ? `${ac.base} + Dex (max ${ac.max_bonus})` : `${ac.base} + Dex`
}

function equipment(item) {
  const damage = item.damage?.damage_dice
    ? `${item.damage.damage_dice} ${item.damage.damage_type?.name ?? ''}`.trim() + (item.two_handed_damage ? ` (two-handed ${item.two_handed_damage.damage_dice})` : '')
    : undefined
  const properties = [...(item.properties ?? []).map((p) => p.name), ...(item.mastery ? [`Mastery: ${item.mastery.name}`] : [])]
  return {
    index: item.index,
    name: item.name,
    category: equipmentCategory(item),
    detail: equipmentDetail(item),
    cost: item.cost ? `${item.cost.quantity} ${item.cost.unit}` : undefined,
    costGp: item.cost ? Math.round(item.cost.quantity * (GP[item.cost.unit] ?? 1) * 100) / 100 : undefined,
    weight: item.weight,
    damage,
    properties: properties.length ? properties : undefined,
    ac: armorClass(item.armor_class),
    strength: item.str_minimum || undefined,
    stealthDisadvantage: item.stealth_disadvantage || undefined,
    desc: toText(item.desc) ?? item.description,
  }
}

function ruleSection(r) {
  // Drop the first heading, since the app shows the section name as its own title.
  return { index: r.index, name: r.name, desc: r.desc.replace(/^#+ .*\n+/, '') }
}

// --- Build --------------------------------------------------------------------

const byName = (a, b) => a.name.localeCompare(b.name)

async function build(edition) {
  const dir = new URL(`${edition}/`, OUT_DIR)
  await mkdir(dir, { recursive: true })

  const files = {
    monsters: (await load(edition, 'Monsters')).map(monster),
    spells: (await load(edition, 'Spells')).map(spell),
    conditions: (await load(edition, 'Conditions')).map(condition),
    // Skip "parent" items that just combine their versions (e.g. "Armor, +1, +2, or +3"): 2014 marks
    // them "Varies"; in 2024 they're the ones listing variants (each version has its own entry).
    'magic-items': await (async () => {
      const raw = (await load(edition, 'Magic-Items')).filter((i) => i.rarity.name !== 'Varies' && !(edition === '2024' && i.variants?.length))
      const items = raw.map(magicItem)
      return edition === '2024' ? fixTables2024(items) : items
    })(),
    equipment: (await load(edition, 'Equipment')).map(equipment),
  }
  // The 2024 data has no rule sections yet; the app falls back to its own quick rules.
  if (edition === '2014') files.rules = (await load(edition, 'Rule-Sections')).map(ruleSection)

  for (const [name, data] of Object.entries(files)) {
    await writeFile(new URL(`${name}.json`, dir), JSON.stringify(data.sort(byName)))
    console.log(`${edition}/${name}.json: ${data.length} entries`)
  }
}

await build('2014')
await build('2024')
