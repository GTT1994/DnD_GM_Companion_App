// Formatted notes are stored as the editor's document (JSON): a tree of blocks such as headings,
// paragraphs and tick-box lists. These helpers build and reshape those documents without any UI:
// old plain-text notes, the session template, and carrying unticked items into the next plan.

import type { JSONContent } from '@tiptap/core'

export type RichDoc = JSONContent  // { type: 'doc', content: [ ...blocks ] }

export const emptyDoc = (): RichDoc => ({ type: 'doc', content: [] })

const text = (value: string): JSONContent => ({ type: 'text', text: value })
export const heading = (value: string, level = 2): JSONContent => ({ type: 'heading', attrs: { level }, content: [text(value)] })
export const paragraph = (value: string): JSONContent => ({ type: 'paragraph', content: [text(value)] })
export const bulletList = (lines: string[]): JSONContent => ({
  type: 'bulletList',
  content: lines.map((line) => ({ type: 'listItem', content: [paragraph(line)] })),
})
export const taskList = (lines: string[]): JSONContent => ({ type: 'taskList', content: lines.map((line) => taskItem(line)) })
const taskItem = (value = '', checked = false): JSONContent => ({
  type: 'taskItem',
  attrs: { checked },
  content: [value ? { type: 'paragraph', content: [text(value)] } : { type: 'paragraph' }],
})

// True when the document has no text and no tick-boxes (e.g. a new, untouched plan).
export function isEmptyDoc(doc: RichDoc | undefined): boolean {
  const hasContent = (node: JSONContent): boolean =>
    (node.type === 'text' && !!node.text?.trim()) || node.type === 'taskItem' || (node.content ?? []).some(hasContent)
  return !doc || !hasContent(doc)
}

// The document's text with no formatting, e.g. for a short preview.
export function docToText(doc: RichDoc | undefined): string {
  const walk = (node: JSONContent): string =>
    // Text inside a paragraph or heading joins up; separate blocks (and list items) get a space between.
    node.type === 'text' ? node.text ?? '' : (node.content ?? []).map(walk).join(node.type === 'paragraph' || node.type === 'heading' ? '' : ' ')
  return doc ? walk(doc).replace(/\s+/g, ' ').trim() : ''
}

// Old notes were plain text: each line becomes a paragraph.
export function textToDoc(value: string): RichDoc {
  if (!value.trim()) return emptyDoc()
  return {
    type: 'doc',
    content: value.split('\n').map((line) => (line ? { type: 'paragraph', content: [text(line)] } : { type: 'paragraph' })),
  }
}

// The session plan template: a heading per part of the prep, each with an empty tick-box list.
export const TEMPLATE_SECTIONS = ['Strong start', 'Scenes', 'Secrets & clues', 'NPCs', 'Locations', 'Encounters', 'Treasure']

export function sessionTemplate(): RichDoc {
  return {
    type: 'doc',
    content: TEMPLATE_SECTIONS.flatMap((title) => [heading(title), { type: 'taskList', content: [taskItem()] }]),
  }
}

// What carries into the next session's plan: unticked tick-box items, under the heading they were
// under. Everything else (ticked items, paragraphs, other lists) is left behind in the session log.
export function carryOver(doc: RichDoc | undefined): RichDoc {
  const kept: JSONContent[] = []
  let pendingHeading: JSONContent | null = null  // only kept if something follows it
  for (const block of doc?.content ?? []) {
    if (block.type === 'heading') {
      pendingHeading = block
      continue
    }
    if (block.type !== 'taskList') continue
    const open = (block.content ?? []).filter((item) => !item.attrs?.checked && !isEmptyDoc({ type: 'doc', content: [item.content?.[0] ?? {}] }))
    if (open.length === 0) continue
    if (pendingHeading) kept.push(pendingHeading)
    pendingHeading = null
    kept.push({ ...block, content: open })
  }
  return { type: 'doc', content: kept }
}

// A campaign's notes with both documents present. Notes saved before formatting existed have
// plain "text" instead, which is converted.
export function normaliseNote(old: { campaignId: string; text?: string; doc?: RichDoc; plan?: RichDoc; updatedAt?: number }) {
  return {
    campaignId: old.campaignId,
    doc: old.doc ?? textToDoc(old.text ?? ''),
    plan: old.plan ?? emptyDoc(),
    updatedAt: old.updatedAt ?? Date.now(),
  }
}

// Adds blocks to the section under a heading (e.g. "Secrets & clues"), after anything already there.
// Tick-boxes join the section's tick-box list, replacing an empty one left by the template.
// If there's no such heading, the heading and blocks are added at the end.
export function addUnderHeading(doc: RichDoc | undefined, title: string, blocks: JSONContent[]): RichDoc {
  const content = [...(doc?.content ?? [])]
  const isTitle = (b: JSONContent) => b.type === 'heading' && b.attrs?.level === 2 && docToText({ type: 'doc', content: [b] }) === title
  const start = content.findIndex(isTitle)
  if (start === -1) return { type: 'doc', content: [...content, heading(title), ...blocks] }
  // The section ends at the next level 2 heading.
  const next = content.findIndex((b, i) => i > start && b.type === 'heading' && b.attrs?.level === 2)
  const end = next === -1 ? content.length : next
  const toAdd = [...blocks]
  const last = content[end - 1]
  if (end - 1 > start && last.type === 'taskList' && toAdd[0]?.type === 'taskList') {
    // Join the lists, dropping empty template tick-boxes.
    const filled = (last.content ?? []).filter((item) => !isEmptyDoc({ type: 'doc', content: item.content ?? [] }))
    content[end - 1] = { ...last, content: [...filled, ...(toAdd.shift()!.content ?? [])] }
  }
  content.splice(end, 0, ...toAdd)
  return { type: 'doc', content }
}

// Adds blocks to the end of a document.
export const appendBlocks = (doc: RichDoc | undefined, blocks: JSONContent[]): RichDoc =>
  ({ type: 'doc', content: [...(doc?.content ?? []), ...blocks] })
