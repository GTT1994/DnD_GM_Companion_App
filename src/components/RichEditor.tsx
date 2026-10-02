// A formatted text box (the TipTap editor): headings, bold, italic, bullet and numbered lists,
// and tick-box lists, with a small toolbar. Markdown-style shortcuts also work while typing:
// "## " for a heading, "- " for a bullet, "[ ] " for a tick-box, ⌘B / ⌘I for bold / italic.
// The editor keeps its own copy of the text: give it a new "key" to load different content.

import { useEffect, useRef } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import type { RichDoc } from '../lib/richText'

type RichEditorProps = {
  initial: RichDoc
  onChange: (doc: RichDoc) => void
  label: string          // read out by screen readers (and used by the browser tests)
  placeholder?: string
  minHeight?: string
}

export function RichEditor({ initial, onChange, label, placeholder, minHeight }: RichEditorProps) {
  // The editor is set up once, so it calls the latest onChange through a ref.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: initial,
    onUpdate: ({ editor }) => onChangeRef.current(editor.getJSON()),
    editorProps: { attributes: { class: 'rich-text', 'aria-label': label, role: 'textbox', 'aria-multiline': 'true' } },
  })

  return (
    <div className="rich-editor" style={minHeight ? { ['--rich-min-height' as string]: minHeight } : undefined}>
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}

// The formatting buttons, highlighted when the text at the cursor already has that format.
function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      bullets: e.isActive('bulletList'),
      numbers: e.isActive('orderedList'),
      tasks: e.isActive('taskList'),
    }),
  })
  const chain = () => editor.chain().focus()
  const buttons: [keyof typeof state, string, string, () => void][] = [
    ['h2', 'H2', 'Heading', () => chain().toggleHeading({ level: 2 }).run()],
    ['h3', 'H3', 'Subheading', () => chain().toggleHeading({ level: 3 }).run()],
    ['bold', 'B', 'Bold (⌘B)', () => chain().toggleBold().run()],
    ['italic', 'I', 'Italic (⌘I)', () => chain().toggleItalic().run()],
    ['bullets', '• List', 'Bullet list', () => chain().toggleBulletList().run()],
    ['numbers', '1. List', 'Numbered list', () => chain().toggleOrderedList().run()],
    ['tasks', '☑ Tick-boxes', 'Tick-box list', () => chain().toggleTaskList().run()],
  ]
  return (
    <div className="rich-toolbar" role="toolbar" aria-label="Formatting">
      {buttons.map(([key, text, title, run]) => (
        <button
          key={key}
          type="button"
          className={`small ${state[key] ? 'selected' : ''} format-${key}`}
          title={title}
          aria-label={title}
          aria-pressed={state[key]}
          // Keep the cursor in the text when clicking a button
          onMouseDown={(e) => e.preventDefault()}
          onClick={run}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
