// The Rumours & hooks tab: rumours (true, partly true or false, with what's really going on,
// for the GM only) and plot hooks (who asks, what for, the catch, the reward). Inside a campaign,
// each can go into the session plan or the campaign notes.

import { generateHook, generateRumour, TRUTH_LABELS, type Hook, type Rumour } from '../../lib/worldGenerators'
import { hookNotes, rumourNotes } from '../../lib/generatorNotes'
import { useSavedState } from '../../lib/storage'
import { SaveToCampaign } from './SaveButtons'
import { HISTORY } from './shared'

type Result = { kind: 'rumours'; id: string; rumours: Rumour[] } | { kind: 'hook'; id: string; hook: Hook }

export function RumourGenerator() {
  const [results, setResults] = useSavedState<Result[]>('rumours', [])
  const add = (result: Result) => setResults([result, ...results].slice(0, HISTORY))

  return (
    <div className="generator">
      <div className="generator-controls">
        <button type="button" className="primary" onClick={() => add({ kind: 'rumours', id: crypto.randomUUID(), rumours: [generateRumour(), generateRumour(), generateRumour()] })}>
          Generate rumours
        </button>
        <button type="button" className="primary" onClick={() => add({ kind: 'hook', id: crypto.randomUUID(), hook: generateHook() })}>
          Generate plot hook
        </button>
        {results.length > 0 && <button type="button" onClick={() => setResults([])}>Clear</button>}
      </div>
      <div className="generator-results">
        {results.map((r) => (r.kind === 'rumours' ? (
          <article key={r.id} className="card rumour-card">
            <h3>Rumours</h3>
            <ul>
              {r.rumours.map((rumour) => (
                <li key={rumour.id}>
                  {rumour.text}{' '}
                  <span className={`tag truth-${rumour.truth}`} title="For the GM only">{TRUTH_LABELS[rumour.truth]}</span>
                  {rumour.behind && <div className="meta">Really: {rumour.behind}</div>}
                </li>
              ))}
            </ul>
            <div className="card-actions"><SaveToCampaign saveable={rumourNotes(r.rumours)} /></div>
          </article>
        ) : (
          <article key={r.id} className="card hook-card">
            <h3>Plot hook</h3>
            <ul>
              <li><strong>Who:</strong> {r.hook.giver}</li>
              <li><strong>Wants the party to:</strong> {r.hook.goal}</li>
              <li><strong>The catch:</strong> {r.hook.complication}</li>
              <li><strong>Reward:</strong> {r.hook.reward}</li>
            </ul>
            <div className="card-actions"><SaveToCampaign saveable={hookNotes(r.hook)} /></div>
          </article>
        )))}
      </div>
    </div>
  )
}
