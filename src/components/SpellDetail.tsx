// Shows a spell's details: level, casting time, range, components, duration and description.
// Used in Quick Lookup and as the preview in the homebrew spell editor.

import type { ReactNode } from 'react'
import type { Spell } from '../data/srd'
import { Markdown } from './Markdown'

type SpellDetailProps = {
  spell: Spell
  extra?: ReactNode  // buttons shown next to the name, e.g. "Make homebrew copy"
}

export function SpellDetail({ spell: s, extra }: SpellDetailProps) {
  const level = s.level === 0 ? `${s.school} cantrip` : `Level ${s.level} ${s.school.toLowerCase()}`
  return (
    <article>
      <header className="detail-header">
        <div>
          <h2>{s.name || 'Unnamed spell'}</h2>
          <p className="meta">
            {level}{s.ritual ? ' (ritual)' : ''}
            {s.homebrew && <span className="tag homebrew-tag">Homebrew</span>}
          </p>
        </div>
        {extra}
      </header>
      <p className="line"><strong>Casting Time</strong> {s.castingTime}</p>
      <p className="line"><strong>Range</strong> {s.range}</p>
      <p className="line"><strong>Components</strong> {s.components}</p>
      <p className="line"><strong>Duration</strong> {s.concentration ? `Concentration, ${s.duration.replace(/^Concentration, /i, '')}` : s.duration}</p>
      <div className="rule" />
      <Markdown text={s.desc} />
      {s.higherLevel && <Markdown text={`**At Higher Levels.** ${s.higherLevel}`} />}
      {s.classes.length > 0 && <p className="meta">Classes: {s.classes.join(', ')}</p>}
    </article>
  )
}
