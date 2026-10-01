// Shows how hard an encounter is for the party, with a bar marking each difficulty threshold.

import type { Difficulty } from '../lib/encounters'

export function DifficultyPanel({ difficulty: d, partySize }: { difficulty: Difficulty; partySize: number }) {
  if (partySize === 0) return <p className="meta">Add PCs to the party (Overview) to see the difficulty.</p>

  // The bar runs a little past the top threshold, or to the encounter's XP if that's higher.
  const top = Math.max(d.thresholds[d.thresholds.length - 1].xp * 1.2, d.compareXp)
  const percent = (xp: number) => `${Math.min(100, (xp / top) * 100)}%`
  // 2014: the next threshold the encounter hasn't reached yet. (2024 budgets are upper limits, shown on the bar.)
  const next = d.edition === '2014' ? d.thresholds.find((t) => d.compareXp < t.xp) : undefined

  return (
    <div className="difficulty">
      <div className={`difficulty-rating rating-${d.rating.toLowerCase().replace(/\s+/g, '-')}`}>{d.rating}</div>
      <p className="meta">
        {d.edition === '2014'
          ? `${d.xp.toLocaleString()} XP × ${d.multiplier} = ${d.compareXp.toLocaleString()} adjusted XP`
          : `${d.xp.toLocaleString()} XP`}
        {next && ` · ${next.label} at ${next.xp.toLocaleString()}`}
      </p>
      <div className="difficulty-bar" role="img" aria-label={`${d.rating}: ${d.compareXp} XP`}>
        <div className="difficulty-fill" style={{ width: percent(d.compareXp) }} />
        {d.thresholds.map((t) => (
          <div key={t.label} className="difficulty-marker" style={{ left: percent(t.xp) }} title={`${t.label}: ${t.xp.toLocaleString()} XP`}>
            <span>{t.label}</span>
          </div>
        ))}
      </div>
      <p className="meta small-print">
        {d.edition === '2014' ? '2014 rules: adjusted XP compared with the party\'s thresholds.' : '2024 rules: total XP compared with the party\'s XP budget.'}
      </p>
    </div>
  )
}
