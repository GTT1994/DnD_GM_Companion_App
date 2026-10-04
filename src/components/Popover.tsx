// A small pop-up box fixed to the screen next to the button that opened it (see lib/popover.ts),
// following the button if the page scrolls. Clicking anywhere outside it or pressing Escape closes
// it. Clicks outside still go through, so e.g. pressing Dmg while the ⋯ menu is open closes the
// menu and does the damage.

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { anchorTo, type Anchor } from '../lib/popover'

type PopoverProps = {
  at: Anchor                             // where it opens (worked out when the button was clicked)
  align: 'left' | 'right'                // line up with the button's left or right edge
  label: string                          // for screen readers, e.g. "Add condition to Goblin"
  className?: string
  opener: RefObject<HTMLElement | null>  // the button that toggles it (its own clicks don't count as outside)
  onClose: () => void
  children: ReactNode
}

export function Popover({ at, align, label, className, opener, onClose, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(at)
  // The latest onClose, so the listeners below are added once.
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    const outside = (target: EventTarget | null) =>
      !ref.current?.contains(target as Node) && !opener.current?.contains(target as Node)
    const onPointerDown = (e: PointerEvent) => outside(e.target) && close.current()
    // Scrolling or resizing moves it with its button.
    const follow = () => opener.current && setPosition(anchorTo(opener.current, align))
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [opener, align])

  return (
    <div ref={ref} role="dialog" aria-label={label} className={`popover ${className ?? ''}`} style={{ position: 'fixed', ...position }}>
      {children}
    </div>
  )
}
