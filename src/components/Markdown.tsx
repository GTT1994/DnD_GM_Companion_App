// Shows Markdown text (bold, lists, tables) as formatted HTML. Used for SRD rules text.
// With rollLabel, dice in the text ("8d6 fire damage") become buttons that roll in the dice tray.

import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useDiceTray } from '../lib/diceTray'
import { remarkDice, ROLL_PREFIX } from '../lib/remarkDice'

type MarkdownProps = {
  text: string
  rollLabel?: string  // what the dice are for, shown in the tray's history (e.g. the spell name)
}

export function Markdown({ text, rollLabel }: MarkdownProps) {
  const tray = useDiceTray()
  const rollable = rollLabel !== undefined && tray
  // Dice links (from remarkDice) become buttons; other links stay links.
  const components: Components = {
    a: ({ href, children, title }) => {
      if (tray && href?.startsWith(ROLL_PREFIX)) {
        const dice = decodeURIComponent(href.slice(ROLL_PREFIX.length))
        return <button type="button" className="dice-link" title={`Roll ${dice}`} onClick={() => tray.roll(dice, rollLabel)}>{children}</button>
      }
      return <a href={href} title={title}>{children}</a>
    },
  }
  return (
    <div className="markdown">
      {/* remarkGfm adds support for tables */}
      <ReactMarkdown remarkPlugins={rollable ? [remarkGfm, remarkDice] : [remarkGfm]} components={components}>{text}</ReactMarkdown>
    </div>
  )
}
