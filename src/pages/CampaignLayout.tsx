// Wraps every page inside a campaign: checks the campaign exists, records that it was
// opened, then shows the campaign page for the current address.

import { useEffect } from 'react'
import { Link, Outlet } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useCampaignRoute } from '../lib/appContext'
import { touchCampaign } from '../lib/store'

export function CampaignLayout() {
  const { campaignId } = useCampaignRoute()
  // undefined while loading, null if there's no such campaign.
  const campaign = useLiveQuery(async () => (await db.campaigns.get(campaignId!)) ?? null, [campaignId])

  useEffect(() => {
    if (campaignId) touchCampaign(campaignId)
  }, [campaignId])

  if (campaign === undefined) return <p className="empty">Loading…</p>
  if (campaign === null) return <p className="empty">This campaign doesn't exist (it may have been deleted). <Link to="/">Go home</Link></p>
  return <Outlet />
}
