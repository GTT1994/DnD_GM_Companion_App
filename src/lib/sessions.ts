// Saving a campaign's notes and session plan, ending a session (into the session log), and
// editing past sessions. All writes for notes and sessions go through here.

import { db } from '../db'
import type { Note, Session } from '../types'
import { carryOver, normaliseNote, type RichDoc } from './richText'

// A campaign's notes, with empty documents if nothing has been written yet.
export async function getNote(campaignId: string): Promise<Note> {
  return normaliseNote((await db.notes.get(campaignId)) ?? { campaignId })
}

// Saves one of the two documents, keeping the other as it is.
export function saveNote(campaignId: string, changes: { doc?: RichDoc; plan?: RichDoc }) {
  return db.transaction('rw', db.notes, async () => {
    await db.notes.put({ ...(await getNote(campaignId)), ...changes, updatedAt: Date.now() })
  })
}

// The number for the next session: one more than the highest so far.
export async function nextSessionNumber(campaignId: string): Promise<number> {
  const sessions = await db.sessions.where('campaignId').equals(campaignId).toArray()
  return Math.max(0, ...sessions.map((s) => s.number)) + 1
}

export type SessionFields = Pick<Session, 'number' | 'date' | 'title' | 'recap'>

// Ends the session: saves the plan (as it is now) and the recap to the session log, then starts
// the next plan with the unticked items carried over. Returns the new session's id.
export function endSession(campaignId: string, plan: RichDoc, fields: SessionFields) {
  return db.transaction('rw', [db.notes, db.sessions], async () => {
    const now = Date.now()
    const id = crypto.randomUUID()
    await db.sessions.add({ id, campaignId, ...fields, plan, createdAt: now, updatedAt: now })
    await saveNote(campaignId, { plan: carryOver(plan) })
    return id
  })
}

export function saveSession(session: Session) {
  return db.sessions.put({ ...session, updatedAt: Date.now() })
}

export function deleteSession(id: string) {
  return db.sessions.delete(id)
}

// Today's date as YYYY-MM-DD (in local time, not UTC).
export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
