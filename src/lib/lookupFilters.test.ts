// Tests for the monster and spell list filters.

import { describe, expect, it } from 'vitest'
import type { Monster, Spell } from '../data/srd'
import {
  activeMonsterFilters, castingTimeOf, compareMonsters, monsterMatches, monsterSizes, monsterType, NO_MONSTER_FILTERS,
  NO_SPELL_FILTERS, spellMatches,
} from './lookupFilters'

const monster = (fields: Partial<Monster>): Monster => ({
  index: 'x', name: 'X', meta: 'Medium, humanoid (goblinoid), neutral evil', ac: 12, hp: 7, hitDice: '2d6', speed: '30 ft.',
  abilities: [10, 10, 10, 10, 10, 10], senses: '', cr: 1, xp: 200, ...fields,
})
const spell = (fields: Partial<Spell>): Spell => ({
  index: 's', name: 'S', level: 1, school: 'Evocation', castingTime: '1 action', range: '60 feet', components: 'V',
  duration: 'Instantaneous', concentration: false, ritual: false, desc: '', classes: ['Wizard'], ...fields,
})

describe('monster details', () => {
  it('reads the type and sizes from the stat block line', () => {
    expect(monsterType(monster({}))).toBe('humanoid')
    expect(monsterType(monster({ meta: 'Medium, swarm of Tiny beasts, unaligned' }))).toBe('swarm')
    expect(monsterSizes(monster({ meta: 'Medium or small, humanoid, neutral' }))).toEqual(['Small', 'Medium'])
  })
})

describe('monsterMatches', () => {
  const dragon = monster({ meta: 'Huge, dragon, chaotic evil', cr: 17, immunities: 'fire', legendaryActions: [{ name: 'Tail', desc: '' }] })
  const golem = monster({ meta: 'Large, construct, unaligned', cr: 5, resistances: 'bludgeoning, piercing, and slashing from nonmagical attacks', homebrew: true })

  it('filters by CR range, type and size', () => {
    expect(monsterMatches(dragon, { ...NO_MONSTER_FILTERS, crMin: '10', crMax: '20' })).toBe(true)
    expect(monsterMatches(golem, { ...NO_MONSTER_FILTERS, crMin: '10' })).toBe(false)
    expect(monsterMatches(dragon, { ...NO_MONSTER_FILTERS, crMax: '0.5' })).toBe(false)
    expect(monsterMatches(dragon, { ...NO_MONSTER_FILTERS, type: 'dragon', size: 'Huge' })).toBe(true)
    expect(monsterMatches(dragon, { ...NO_MONSTER_FILTERS, size: 'Large' })).toBe(false)
  })

  it('filters legendary, homebrew and environment', () => {
    expect(monsterMatches(dragon, { ...NO_MONSTER_FILTERS, legendary: true })).toBe(true)
    expect(monsterMatches(golem, { ...NO_MONSTER_FILTERS, legendary: true })).toBe(false)
    expect(monsterMatches(golem, { ...NO_MONSTER_FILTERS, homebrew: true })).toBe(true)
    expect(monsterMatches(monster({ index: 'goblin' }), { ...NO_MONSTER_FILTERS, environment: 'forest' })).toBe(true)
    expect(monsterMatches(monster({ index: 'goblin' }), { ...NO_MONSTER_FILTERS, environment: 'underwater' })).toBe(false)
  })

  it('filters by damage defences', () => {
    expect(monsterMatches(dragon, { ...NO_MONSTER_FILTERS, damageType: 'fire' })).toBe(true)
    expect(monsterMatches(dragon, { ...NO_MONSTER_FILTERS, damageType: 'fire', defense: 'resistant' })).toBe(false)
    expect(monsterMatches(golem, { ...NO_MONSTER_FILTERS, damageType: 'piercing', defense: 'resistant' })).toBe(true)
    expect(monsterMatches(golem, { ...NO_MONSTER_FILTERS, damageType: 'fire' })).toBe(false)
  })

  it('counts the filters that are on and sorts by CR', () => {
    expect(activeMonsterFilters({ ...NO_MONSTER_FILTERS, crMin: '1', legendary: true, sort: 'cr' })).toBe(2)
    expect([dragon, golem].sort((a, b) => compareMonsters(a, b, 'cr')).map((m) => m.cr)).toEqual([5, 17])
  })
})

describe('spellMatches', () => {
  const fireball = spell({ name: 'Fireball', level: 3, classes: ['Sorcerer', 'Wizard'], damageType: 'Fire', saveAbility: 'DEX' })
  const shield = spell({ name: 'Shield', castingTime: 'Reaction, which you take when you are hit', classes: ['Sorcerer', 'Wizard'] })
  const bolt = spell({ name: 'Fire Bolt', level: 0, attackType: 'ranged', damageType: 'Fire' })

  it('filters by class, level, school and casting time', () => {
    expect(spellMatches(fireball, { ...NO_SPELL_FILTERS, cls: 'Wizard', level: '3', school: 'Evocation' })).toBe(true)
    expect(spellMatches(fireball, { ...NO_SPELL_FILTERS, cls: 'Cleric' })).toBe(false)
    expect(spellMatches(bolt, { ...NO_SPELL_FILTERS, level: '0' })).toBe(true)
    expect(spellMatches(shield, { ...NO_SPELL_FILTERS, castingTime: 'reaction' })).toBe(true)
    expect(spellMatches(fireball, { ...NO_SPELL_FILTERS, castingTime: 'reaction' })).toBe(false)
  })

  it('filters by attack, save and damage type', () => {
    expect(spellMatches(bolt, { ...NO_SPELL_FILTERS, attackSave: 'attack', damageType: 'fire' })).toBe(true)
    expect(spellMatches(fireball, { ...NO_SPELL_FILTERS, attackSave: 'attack' })).toBe(false)
    expect(spellMatches(fireball, { ...NO_SPELL_FILTERS, attackSave: 'save' })).toBe(true)
    expect(spellMatches(fireball, { ...NO_SPELL_FILTERS, attackSave: 'DEX' })).toBe(true)
    expect(spellMatches(fireball, { ...NO_SPELL_FILTERS, attackSave: 'WIS' })).toBe(false)
  })

  it('filters concentration and ritual', () => {
    expect(spellMatches(spell({ concentration: true }), { ...NO_SPELL_FILTERS, concentration: true })).toBe(true)
    expect(spellMatches(fireball, { ...NO_SPELL_FILTERS, ritual: true })).toBe(false)
  })
})

describe('castingTimeOf', () => {
  it('reads 2014 and 2024 casting times', () => {
    expect(castingTimeOf({ castingTime: '1 bonus action' })).toBe('bonus')
    expect(castingTimeOf({ castingTime: 'Bonus Action, which you take immediately after hitting' })).toBe('bonus')
    expect(castingTimeOf({ castingTime: 'Action (Overgrowth) or 8 hours (Enrichment)' })).toBe('action')
    expect(castingTimeOf({ castingTime: '10 minutes' })).toBe('longer')
  })
})
