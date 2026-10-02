// A "More ▾" button that opens a short list of less-used actions. Clicking an action, clicking
// outside the list, or pressing Escape closes it.

import { useState } from 'react'

export type MenuItem = { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; title?: string }

export function MoreMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="more-menu" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>More ▾</button>
      {open && (
        <>
          {/* An invisible layer over the page: clicking anywhere else closes the menu */}
          <div className="menu-backdrop" onClick={() => setOpen(false)} />
          <div className="more-menu-items" role="menu">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={item.danger ? 'danger' : ''}
                disabled={item.disabled}
                title={item.title}
                onClick={() => {
                  setOpen(false)
                  item.onClick()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
