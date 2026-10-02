// Tests for formatted notes: converting old plain text, the session template, and carrying
// unticked items into the next session's plan.

import { describe, expect, it } from 'vitest'
import { carryOver, docToText, emptyDoc, isEmptyDoc, normaliseNote, sessionTemplate, TEMPLATE_SECTIONS, textToDoc, type RichDoc } from './richText'

const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const h = (text: string) => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] })
const task = (text: string, checked = false) => ({ type: 'taskItem', attrs: { checked }, content: [p(text)] })
const tasks = (...items: object[]) => ({ type: 'taskList', content: items })

describe('textToDoc and docToText', () => {
  it('turns each line of old notes into a paragraph', () => {
    expect(textToDoc('Strahd wants Ireena.\n\nBeware the mists')).toEqual({
      type: 'doc', content: [p('Strahd wants Ireena.'), { type: 'paragraph' }, p('Beware the mists')],
    })
    expect(textToDoc('  ')).toEqual(emptyDoc())
  })

  it('gets the plain text back for previews', () => {
    expect(docToText({ type: 'doc', content: [h('Scenes'), tasks(task('Ambush'), task('Tavern'))] })).toBe('Scenes Ambush Tavern')
  })
})

describe('isEmptyDoc', () => {
  it('is empty with no text or tick-boxes', () => {
    expect(isEmptyDoc(emptyDoc())).toBe(true)
    expect(isEmptyDoc({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe(true)
    expect(isEmptyDoc(textToDoc('x'))).toBe(false)
    expect(isEmptyDoc(sessionTemplate())).toBe(false)  // has (empty) tick-boxes to fill in
  })
})

describe('sessionTemplate', () => {
  it('has a heading and a tick-box list for each section', () => {
    const doc = sessionTemplate()
    expect(doc.content!.filter((b) => b.type === 'heading').map((b) => b.content![0].text)).toEqual(TEMPLATE_SECTIONS)
    expect(doc.content!.filter((b) => b.type === 'taskList')).toHaveLength(TEMPLATE_SECTIONS.length)
  })
})

describe('carryOver', () => {
  it('keeps unticked items under their headings and drops the rest', () => {
    const plan: RichDoc = {
      type: 'doc',
      content: [
        h('Strong start'), tasks(task('Ambush on the road', true)),          // all done: heading dropped
        h('Scenes'), tasks(task('Cragmaw hideout', true), task('Phandalin')),
        p('Remember to give out XP'),                                        // plain text: dropped
        h('Secrets & clues'), tasks(task('Glasstaff is Iarno'), task('')),  // empty item: dropped
        h('Treasure'), tasks(task('')),
      ],
    }
    expect(carryOver(plan)).toEqual({
      type: 'doc',
      content: [h('Scenes'), tasks(task('Phandalin')), h('Secrets & clues'), tasks(task('Glasstaff is Iarno'))],
    })
  })

  it('gives an empty plan when everything was done', () => {
    expect(carryOver({ type: 'doc', content: [h('Scenes'), tasks(task('Done', true))] })).toEqual(emptyDoc())
    expect(isEmptyDoc(carryOver(sessionTemplate()))).toBe(true)
  })
})

describe('normaliseNote', () => {
  it('converts old plain-text notes and adds an empty plan', () => {
    expect(normaliseNote({ campaignId: 'c', text: 'Hello', updatedAt: 3 })).toEqual({ campaignId: 'c', doc: textToDoc('Hello'), plan: emptyDoc(), updatedAt: 3 })
  })
})
