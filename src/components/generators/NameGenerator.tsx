// The Names tab: ten names at a time for a species and gender, for when a player asks
// "what's the barman called?". Inside a campaign, any name can be made into an NPC.

import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Ancestry, Gender } from '../../data/npcTables'
import { generateNames } from '../../lib/generators'
import { useCampaignRoute } from '../../lib/appContext'
import { createNpc } from '../../lib/npcs'
import { useSavedState } from '../../lib/storage'
import { SpeciesGenderPicker } from './shared'

export function NameGenerator() {
  const { campaignId, base } = useCampaignRoute()
  const navigate = useNavigate()
  const [species, setSpecies] = useState<Ancestry | ''>('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [names, setNames] = useSavedState<ReturnType<typeof generateNames>>('names', [])

  async function makeNpc(n: (typeof names)[number]) {
    const id = await createNpc(campaignId!, { name: n.name, species: n.species, gender: n.gender })
    navigate(`${base}/npcs/${encodeURIComponent(id)}`)
  }

  return (
    <div className="generator">
      <div className="generator-controls">
        <SpeciesGenderPicker species={species} gender={gender} onSpecies={setSpecies} onGender={setGender} />
        <button type="button" className="primary" onClick={() => setNames(generateNames(species || undefined, gender || undefined))}>
          Generate names
        </button>
      </div>
      {names.length > 0 && (
        <ul className="name-list">
          {names.map((n) => (
            <li key={n.name}>
              <strong className="generated-name">{n.name}</strong>
              <span className="meta"> {n.gender} {n.species}</span>
              {campaignId && <button type="button" className="small" onClick={() => makeNpc(n)}>Make NPC</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
