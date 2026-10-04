// Where to show a pop-up (the ⋯ row menu, + Condition) next to the button that opened it.
// Pop-ups are fixed to the screen, so the tracker table's scroll box can't cut them off; near the
// bottom of the screen they open upwards instead.

export type Anchor = { top?: number; bottom?: number; left?: number; right?: number }

const ROOM_BELOW = 260  // roughly the tallest pop-up, in pixels

export function anchorTo(button: HTMLElement, align: 'left' | 'right'): Anchor {
  const r = button.getBoundingClientRect()
  const vertical = window.innerHeight - r.bottom < ROOM_BELOW && r.top > ROOM_BELOW
    ? { bottom: window.innerHeight - r.top + 4 }  // open upwards
    : { top: r.bottom + 4 }
  return align === 'left' ? { ...vertical, left: r.left } : { ...vertical, right: window.innerWidth - r.right }
}
