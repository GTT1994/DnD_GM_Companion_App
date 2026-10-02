// Tests for the session log: ending a session saves the plan and recap, numbers sessions,
// and carries unticked items into the next plan.

import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { createCampaign } from './store'
import { endSession, getNote, nextSessionNumber, saveNote } from './sessions'
import { textToDoc, type RichDoc } from './richText'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const plan: RichDoc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Scenes' }] },
    {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ambush' }] }] },
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tavern' }] }] },
      ],
    },
  ],
}

describe('notes', () => {
  it('starts empty, and saving the plan keeps the campaign notes', async () => {
    const campaignId = await createCampaign('Test', '')
    expect(await getNote(campaignId)).toMatchObject({ doc: { type: 'doc', content: [] }, plan: { type: 'doc', content: [] } })
    await saveNote(campaignId, { doc: textToDoc('Lore') })
    await saveNote(campaignId, { plan })
    expect(await getNote(campaignId)).toMatchObject({ doc: textToDoc('Lore'), plan })
  })
})

describe('endSession', () => {
  it('logs the session and carries unticked items over', async () => {
    const campaignId = await createCampaign('Test', '')
    expect(await nextSessionNumber(campaignId)).toBe(1)
    await saveNote(campaignId, { plan })
    await endSession(campaignId, plan, { number: 1, date: '2026-10-02', title: 'Ambushed', recap: textToDoc('Goblins!') })

    const [session] = await db.sessions.toArray()
    expect(session).toMatchObject({ campaignId, number: 1, date: '2026-10-02', title: 'Ambushed', plan, recap: textToDoc('Goblins!') })
    const next = (await getNote(campaignId)).plan
    expect(next.content).toHaveLength(2)                   // the heading and the one open item
    expect(JSON.stringify(next)).toContain('Tavern')
    expect(JSON.stringify(next)).not.toContain('Ambush')
    expect(await nextSessionNumber(campaignId)).toBe(2)
  })
})
