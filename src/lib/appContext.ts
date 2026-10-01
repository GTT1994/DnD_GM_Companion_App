// Settings and helpers shared by every page, provided once in App.tsx through React context
// (a way to pass values to every component without threading them through props).

import { createContext, useContext, type RefObject } from 'react'
import { useMatch, useNavigate } from 'react-router'
import type { Edition, LookupCategory, LookupState } from '../types'
import { QUICK_COMBAT } from '../db'

export type AppContextValue = {
  edition: Edition
  setEdition: (edition: Edition) => void
  lookup: LookupState
  setLookup: (state: LookupState) => void
  searchRef: RefObject<HTMLInputElement | null>  // the Quick Lookup search box, focused by ⌘K
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppContext')
  return value
}

// Which campaign the current page belongs to, if any, and the start of its page addresses.
// e.g. on /campaign/abc/combat → { campaignId: 'abc', base: '/campaign/abc', combatId: 'abc' }
export function useCampaignRoute() {
  const match = useMatch('/campaign/:campaignId/*')
  const campaignId = match?.params.campaignId
  return {
    campaignId,
    base: campaignId ? `/campaign/${campaignId}` : '',
    combatId: campaignId ?? QUICK_COMBAT,  // the fight that "Add to combat" adds to
  }
}

// Returns a function that opens a specific entry in Quick Lookup.
export function useOpenInLookup() {
  const { lookup, setLookup } = useApp()
  const { base } = useCampaignRoute()
  const navigate = useNavigate()
  return (category: LookupCategory, index: string) => {
    setLookup({ ...lookup, category, selected: { category, index } })
    navigate(`${base}/lookup`)
  }
}
