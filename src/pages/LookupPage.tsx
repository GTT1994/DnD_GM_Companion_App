// The Quick Lookup page. "Add to combat" adds monsters to the campaign's fight,
// or to Quick combat when not in a campaign.

import { Lookup } from '../components/Lookup'
import { useApp, useCampaignRoute } from '../lib/appContext'
import { addMonstersToCombat } from '../lib/store'

export function LookupPage() {
  const { edition, lookup, setLookup, searchRef } = useApp()
  const { combatId } = useCampaignRoute()

  return (
    <Lookup
      edition={edition}
      state={lookup}
      setState={setLookup}
      searchRef={searchRef}
      onAddMonster={(monster, count) => addMonstersToCombat(combatId, monster, count, edition)}
    />
  )
}
