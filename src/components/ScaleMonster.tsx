// The "Scale CR" panel above a stat block in Quick Lookup: pick a new challenge rating, see what
// changes (AC, HP, attacks, damage, DCs) next to the original, preview the full stat block, and
// save it as a homebrew copy, e.g. "Ogre (CR 5)".

import { useState } from 'react'
import type { Monster } from '../data/srd'
import { formatCr } from '../lib/dice'
import { CHALLENGE_RATINGS } from '../lib/homebrew'
import { compareScaled, scaleMonster } from '../lib/scaleMonster'
import { StatBlock } from './StatBlock'

type ScaleMonsterProps = {
  monster: Monster
  onSave: (scaled: Monster) => void
  onClose: () => void
}

export function ScaleMonster({ monster, onSave, onClose }: ScaleMonsterProps) {
  // Start one step up from its own CR.
  const [cr, setCr] = useState(CHALLENGE_RATINGS.find((c) => c > monster.cr) ?? monster.cr)
  const scaled = scaleMonster(monster, cr)
  const changes = compareScaled(monster, scaled)

  return (
    <section className="scale-monster card" aria-label="Scale CR">
      <div className="group-save-header">
        <h3>Scale {monster.name} <span className="meta">· DMG stats by challenge rating</span></h3>
        <button type="button" className="remove" onClick={onClose} aria-label="Close scale CR">✕</button>
      </div>
      <div className="scale-controls">
        <label>
          New CR
          <select value={cr} onChange={(e) => setCr(Number(e.target.value))}>
            {CHALLENGE_RATINGS.map((c) => <option key={c} value={c}>{formatCr(c)}{c === monster.cr ? ' (current)' : ''}</option>)}
          </select>
        </label>
        <button type="button" className="primary" disabled={cr === monster.cr} onClick={() => onSave(scaled)}>Save as homebrew</button>
      </div>

      <table className="data-table scale-table">
        <thead>
          <tr><th></th><th>Now</th><th>At CR {formatCr(cr)}</th></tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.label} className={c.before === c.after ? '' : 'changed'}>
              <th scope="row">{c.label}</th>
              <td>{c.before}</td>
              <td>{c.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="meta">Saving throws, skills and spell DCs move with proficiency; ability scores, speed and traits stay the same. Fine-tune it in the editor after saving.</p>

      <details>
        <summary>Preview the full stat block</summary>
        <StatBlock monster={scaled} />
      </details>
    </section>
  )
}
