// The ⋯ button at the end of each tracker row, opening a small menu of less-used controls
// (temp HP, damage type, remove from combat) so the row's main buttons always line up.

import { useRef, useState, type ReactNode } from 'react'
import { anchorTo, type Anchor } from '../lib/popover'
import { Popover } from './Popover'

type RowMenuProps = {
  name: string                                  // the combatant, for the button's label
  children: (close: () => void) => ReactNode    // the menu contents; call close() after an action
}

export function RowMenu({ name, children }: RowMenuProps) {
  const button = useRef<HTMLButtonElement>(null)
  const [at, setAt] = useState<Anchor | null>(null)
  const close = () => setAt(null)

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`row-menu-button ${at ? 'selected' : ''}`}
        aria-label={`More for ${name}`}
        aria-expanded={!!at}
        title="Temp HP, damage type, remove"
        onClick={() => setAt(at ? null : anchorTo(button.current!, 'right'))}
      >
        ⋯
      </button>
      {at && (
        <Popover at={at} align="right" label={`More for ${name}`} className="row-menu" opener={button} onClose={close}>
          {children(close)}
        </Popover>
      )}
    </>
  )
}
