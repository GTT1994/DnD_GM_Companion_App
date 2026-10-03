// The Quick Lookup page. "Add to combat" adds monsters to the campaign's fight,
// or to Quick combat when not in a campaign. SRD entries can be copied into homebrew.

import { useNavigate } from 'react-router'
import { Lookup, type HomebrewTarget } from '../components/Lookup'
import { useApp, useCampaignRoute } from '../lib/appContext'
import { addMonstersToCombat } from '../lib/store'
import { copyMonster, saveMonster, saveSpell, spellToHomebrew } from '../lib/homebrew'

export function LookupPage() {
  const { edition, lookup, setLookup, searchRef } = useApp()
  const { combatId } = useCampaignRoute()
  const navigate = useNavigate()

  // Homebrew entries open in the editor; SRD ones (and monsters scaled to a new CR) are copied into
// homebrew first (tagged with this edition).
  async function homebrew(target: HomebrewTarget) {
    let index = target.entry.index
    if (target.kind === 'monster' && (target.scaled || !target.entry.homebrew)) {
      const copy = copyMonster(target.entry, edition)
      await saveMonster(copy)
      index = copy.index
    } else if (!target.entry.homebrew && target.kind === 'spell') {
      const copy = spellToHomebrew(target.entry, edition)
      await saveSpell(copy)
      index = copy.index
    }
    navigate(`/homebrew/${target.kind}/${index}`)
  }

  return (
    <Lookup
      edition={edition}
      state={lookup}
      setState={setLookup}
      searchRef={searchRef}
      onAddMonster={(monster, count) => addMonstersToCombat(combatId, monster, count, edition)}
      onHomebrew={homebrew}
    />
  )
}
