// Mini labels in the combat tracker: the badge shown with a monster's name (a colour dot and a
// short description of its miniature), and the form in the ✎ pop-up for typing one in.

import { useState } from 'react'
import type { MiniColour, MiniLabel } from '../types'
import { cleanMini, MINI_COLOURS, miniText } from '../lib/minis'

// A colour dot and the label's text, e.g. 🔵 with shield. Long text is cut short (full text on hover).
export function MiniBadge({ mini }: { mini: MiniLabel }) {
  return (
    <span className="mini-badge" title={`Mini: ${miniText(mini)}`}>
      {mini.colour && <span className="mini-dot" style={{ background: MINI_COLOURS[mini.colour] }} aria-hidden="true" />}
      {mini.text && <span className="mini-text">{mini.text}</span>}
    </span>
  )
}

type MiniLabelFormProps = {
  name: string                          // the combatant's name, for labels
  initial?: MiniLabel
  onSave: (mini: MiniLabel | null) => void
  onClose: () => void
}

// Type a description, pick a colour (click it again to unpick), Enter or Save.
export function MiniLabelForm({ name, initial, onSave, onClose }: MiniLabelFormProps) {
  const [text, setText] = useState(initial?.text ?? '')
  const [colour, setColour] = useState<MiniColour | undefined>(initial?.colour)

  function save() {
    onSave(cleanMini(text, colour))
    onClose()
  }

  return (
    <form className="mini-form" onSubmit={(e) => { e.preventDefault(); save() }}>
      <strong>Which mini is {name}?</strong>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. red base, with shield" aria-label="Mini description" autoFocus maxLength={40} />
      <div className="mini-colours" role="group" aria-label="Base colour">
        {(Object.keys(MINI_COLOURS) as MiniColour[]).map((c) => (
          <button
            key={c}
            type="button"
            className={`mini-colour ${colour === c ? 'selected' : ''}`}
            style={{ background: MINI_COLOURS[c] }}
            aria-label={c}
            aria-pressed={colour === c}
            title={c}
            onClick={() => setColour(colour === c ? undefined : c)}
          />
        ))}
      </div>
      <div className="popover-buttons">
        <button type="submit" className="primary small">Save</button>
        {initial && <button type="button" className="small" onClick={() => { onSave(null); onClose() }}>Clear label</button>}
        <button type="button" className="small" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}
