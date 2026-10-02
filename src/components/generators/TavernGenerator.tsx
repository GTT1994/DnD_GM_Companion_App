// The Tavern tab: a name, an innkeeper (who can be saved as an NPC), the atmosphere, a few
// patrons, the menu and prices, and two rumours going round.

import { generateTavern, TRUTH_LABELS, type Tavern } from '../../lib/worldGenerators'
import { tavernNotes } from '../../lib/generatorNotes'
import { useSavedState } from '../../lib/storage'
import { SaveNpcButton, SaveToCampaign } from './SaveButtons'
import { HISTORY } from './shared'

export function TavernGenerator() {
  const [taverns, setTaverns] = useSavedState<Tavern[]>('taverns', [])
  return (
    <div className="generator">
      <div className="generator-controls">
        <button type="button" className="primary" onClick={() => setTaverns([generateTavern(), ...taverns].slice(0, HISTORY))}>Generate tavern</button>
        {taverns.length > 0 && <button type="button" onClick={() => setTaverns([])}>Clear</button>}
      </div>
      <div className="generator-results">
        {taverns.map((t) => (
          <article key={t.id} className="card tavern-card">
            <h3>{t.name}</h3>
            <p className="meta">{t.atmosphere}</p>
            <ul>
              <li>
                <strong>Innkeeper:</strong> {t.owner.name}, {t.owner.ancestry} ({t.owner.gender.toLowerCase()}), {t.owner.personality}; {t.owner.mannerism}{' '}
                <SaveNpcButton npc={t.owner} label="Save as NPC" />
              </li>
              <li><strong>Patrons:</strong> {t.patrons.join('; ')}</li>
              <li><strong>Menu:</strong> {t.menu.join(', ')} <span className="meta">({t.quality}: meal {t.prices.meal}, room {t.prices.room})</span></li>
              <li><strong>Drink:</strong> {t.prices.drink}</li>
              {t.rumours.map((r) => (
                <li key={r.id}>
                  <strong>Rumour:</strong> {r.text} <span className={`tag truth-${r.truth}`} title="For the GM only">{TRUTH_LABELS[r.truth]}</span>
                  {r.behind && <span className="meta"> Really: {r.behind}</span>}
                </li>
              ))}
            </ul>
            <div className="card-actions"><SaveToCampaign saveable={tavernNotes(t)} /></div>
          </article>
        ))}
      </div>
    </div>
  )
}
