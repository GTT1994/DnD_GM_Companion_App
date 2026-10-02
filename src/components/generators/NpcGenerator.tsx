// The NPC tab: a random person with species, gender, job, looks, personality, a mannerism,
// what they want and a secret. Inside a campaign they can be saved as an NPC.

import { useState } from 'react'
import type { Ancestry, Gender } from '../../data/npcTables'
import { generateNpc, type Npc } from '../../lib/generators'
import { useSavedState } from '../../lib/storage'
import { SaveNpcButton } from './SaveButtons'
import { HISTORY, SpeciesGenderPicker } from './shared'

export function NpcGenerator() {
  const [species, setSpecies] = useState<Ancestry | ''>('')  // '' = any
  const [gender, setGender] = useState<Gender | ''>('')
  const [npcs, setNpcs] = useSavedState<Npc[]>('npcs', [])

  return (
    <div className="generator">
      <div className="generator-controls">
        <SpeciesGenderPicker species={species} gender={gender} onSpecies={setSpecies} onGender={setGender} />
        {/* Newest first, keeping only the last few */}
        <button type="button" className="primary" onClick={() => setNpcs([generateNpc(species || undefined, Math.random, { gender: gender || undefined }), ...npcs].slice(0, HISTORY))}>
          Generate NPC
        </button>
        {npcs.length > 0 && <button type="button" onClick={() => setNpcs([])}>Clear</button>}
      </div>
      <div className="generator-results">
        {npcs.map((npc) => (
          <article key={npc.id} className="card">
            <div className="card-actions"><SaveNpcButton npc={npc} /></div>
            <h3>{npc.name}</h3>
            <p className="meta">{[npc.gender, npc.ancestry, npc.occupation].filter(Boolean).join(' ')}</p>
            <ul>
              <li><strong>Looks:</strong> {npc.appearance}</li>
              <li><strong>Personality:</strong> {npc.personality}</li>
              <li><strong>Mannerism:</strong> {npc.mannerism}</li>
              <li><strong>Wants to:</strong> {npc.motivation}</li>
              <li><strong>Secret:</strong> {npc.secret}</li>
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
