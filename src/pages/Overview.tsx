// A campaign's overview page: its name and description, and the party table
// (HP, AC and passive scores at a glance) with add, edit, remove and long rest.

import { useState } from 'react'
import { Link } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Campaign } from '../types'
import { useCampaignRoute } from '../lib/appContext'
import { addPc, deletePc, longRest, updateCampaign, updatePc } from '../lib/store'
import { PcForm } from '../components/PcForm'

export function Overview() {
  const { campaignId, base } = useCampaignRoute()
  const campaign = useLiveQuery(() => db.campaigns.get(campaignId!), [campaignId])
  const party = useLiveQuery(() => db.pcs.where('campaignId').equals(campaignId!).sortBy('name'), [campaignId])
  // Which form is open: null = none, 'new' = adding a PC, otherwise the id of the PC being edited.
  const [editing, setEditing] = useState<string | null>(null)

  if (!campaign || !party) return <p className="empty">Loading…</p>
  const editingPc = party.find((pc) => pc.id === editing)

  return (
    <section className="page">
      <CampaignDetails campaign={campaign} />

      <div className="section-header">
        <h2>Party</h2>
        <div className="toolbar-buttons">
          <button type="button" className="primary" onClick={() => setEditing('new')}>+ Add PC</button>
          <button
            type="button"
            disabled={party.length === 0}
            onClick={() => confirm('Long rest: restore every PC to full HP?') && longRest(campaign.id)}
          >
            Long rest
          </button>
          <Link to={`${base}/combat`} className="button">Go to combat</Link>
        </div>
      </div>

      {editing === 'new' && (
        <PcForm
          onSave={async (fields) => {
            await addPc(campaign.id, fields)
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      {editingPc && (
        <PcForm
          key={editingPc.id}
          pc={editingPc}
          onSave={async (fields) => {
            await updatePc(editingPc, fields)
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {party.length === 0 ? (
        <p className="empty">No party members yet. Add your players' characters to track their HP and passive scores.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Character</th>
              <th>Class</th>
              <th>AC</th>
              <th>HP</th>
              <th className="passive" title="Passive Wisdom (Perception)">Perception</th>
              <th className="passive" title="Passive Wisdom (Insight)">Insight</th>
              <th className="passive" title="Passive Intelligence (Investigation)">Investigation</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {party.map((pc) => (
              <tr key={pc.id}>
                <td className="name-cell">
                  {pc.name}
                  {pc.playerName && <div className="meta">played by {pc.playerName}</div>}
                </td>
                <td>{pc.className ? `${pc.className} ${pc.level}` : `Level ${pc.level}`}</td>
                <td className="ac">{pc.ac}</td>
                <td className={pc.currentHp === 0 ? 'down-label' : ''}>
                  <strong>{pc.currentHp}</strong> / {pc.maxHp}
                  {pc.tempHp > 0 && <span className="temp-hp"> +{pc.tempHp} temp</span>}
                </td>
                <td className="passive">{pc.passivePerception}</td>
                <td className="passive">{pc.passiveInsight}</td>
                <td className="passive">{pc.passiveInvestigation}</td>
                <td className="actions-cell">
                  <button type="button" onClick={() => setEditing(pc.id)}>Edit</button>
                  <button
                    type="button"
                    className="remove"
                    aria-label={`Remove ${pc.name}`}
                    onClick={() => confirm(`Remove ${pc.name} from the party?`) && deletePc(pc.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

// The campaign's name and description, with an Edit button that swaps in a form.
function CampaignDetails({ campaign }: { campaign: Campaign }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(campaign.name)
  const [description, setDescription] = useState(campaign.description)

  if (!editing) {
    return (
      <div className="campaign-details">
        <div>
          <h2>{campaign.name}</h2>
          {campaign.description && <p className="meta">{campaign.description}</p>}
        </div>
        <button type="button" onClick={() => setEditing(true)}>Edit</button>
      </div>
    )
  }

  return (
    <form
      className="panel-form"
      onSubmit={async (e) => {
        e.preventDefault()
        await updateCampaign(campaign.id, { name: name.trim(), description: description.trim() })
        setEditing(false)
      }}
    >
      <label>
        Name
        <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="wide">
        Description
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <button type="submit" className="primary">Save</button>
      <button type="button" onClick={() => setEditing(false)}>Cancel</button>
    </form>
  )
}
