// The Generators page. Inside a campaign, results can be saved to it (NPCs, encounters, and
// text added to the session plan or campaign notes); the generators handle that themselves.

import { Generators } from '../components/Generators'
import { useApp, useOpenInLookup } from '../lib/appContext'

export function GeneratorsPage() {
  const { edition } = useApp()
  const openInLookup = useOpenInLookup()
  return <Generators edition={edition} onOpen={openInLookup} />
}
