import { useEffect, useRef, useState } from 'react'

// floating overflow menu — bubble card, icon rows, optional danger item.
// closes on outside pointer-down or Escape.
export default function Menu({ trigger, items, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div className={`absolute top-full mt-2 z-50 min-w-[248px] p-2 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <div className="bubble menu-in">
            {items.map((it, i) => (
              <button
                key={i}
                onClick={() => { setOpen(false); it.onClick?.() }}
                className={`w-full flex items-center gap-3.5 px-3.5 h-11 rounded-xl text-[15px] transition-colors ${
                  it.danger ? 'text-[#f2564b] hover:bg-white/5' : 'text-sheet hover:bg-white/5'
                }`}
              >
                <span className={it.danger ? '' : 'text-mist'}>{it.icon}</span>
                {it.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
