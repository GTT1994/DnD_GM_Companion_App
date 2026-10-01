// A combat tracker page: Quick combat, or a campaign's own fight.
// Reads the fight from the database and saves every change straight back.

import { useLiveQuery } from 'dexie-react-hooks'
import { CombatTracker } from '../components/CombatTracker'
import { useApp, useOpenInLookup } from '../lib/appContext'
import { addPartyToCombat, applyCombatAction, getCombat } from '../lib/store'

type CombatPageProps = {
  combatId: string     // which saved fight to show
  campaignId?: string  // set inside a campaign, which enables "Add party"
}

export function CombatPage({ combatId, campaignId }: CombatPageProps) {
  const { edition, setEdition } = useApp()
  const openInLookup = useOpenInLookup()
  // useLiveQuery re-runs the query whenever the data changes, so the page always shows the latest fight.
  const combat = useLiveQuery(() => getCombat(combatId), [combatId])

  if (!combat) return <p className="empty">Loading…</p>

  return (
    <CombatTracker
      combat={combat}
      dispatch={(action) => applyCombatAction(combatId, action)}
      edition={edition}
      onOpenMonster={(monsterEdition, index) => {
        setEdition(monsterEdition)  // show the stat block from the edition it was added from
        openInLookup('monsters', index)
      }}
      onAddParty={campaignId ? () => addPartyToCombat(campaignId) : undefined}
    />
  )
}
