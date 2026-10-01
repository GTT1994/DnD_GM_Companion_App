// Shows Markdown text (bold, lists, tables) as formatted HTML. Used for SRD rules text.

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      {/* remarkGfm adds support for tables */}
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  )
}
