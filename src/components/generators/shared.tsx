// Small pieces shared by the generator tabs.

import { ancestries, type Ancestry, type Gender } from '../../data/npcTables'

export const HISTORY = 8  // how many past results each tab keeps

type SpeciesGenderPickerProps = {
  species: Ancestry | ''
  gender: Gender | ''
  onSpecies: (species: Ancestry | '') => void
  onGender: (gender: Gender | '') => void
}

// Species and gender drop-downs, each with an "any" choice.
export function SpeciesGenderPicker({ species, gender, onSpecies, onGender }: SpeciesGenderPickerProps) {
  return (
    <>
      <select value={species} onChange={(e) => onSpecies(e.target.value as Ancestry | '')} aria-label="Species">
        <option value="">Any species</option>
        {Object.keys(ancestries).map((a) => <option key={a}>{a}</option>)}
      </select>
      <select value={gender} onChange={(e) => onGender(e.target.value as Gender | '')} aria-label="Gender">
        <option value="">Any gender</option>
        <option>Female</option>
        <option>Male</option>
      </select>
    </>
  )
}
