import { X } from 'lucide-react'
// white sliding sheet — the light layer that everything content lives on
export default function Sheet({ title, onClose, children, className = '' }) {
  return (
    <div className={`sheet-enter absolute inset-x-0 bottom-0 z-20 rounded-t-[2rem] bg-sheet shadow-sheet ${className}`}>
      <div className="pt-3 pb-1 grid place-items-center">
        <div className="w-10 h-1.5 rounded-full bg-fog" />
      </div>
      <div className="flex items-center justify-between px-6 pt-2 pb-4">
        <h2 className="text-lg font-medium text-ink">{title}</h2>
        <button onClick={onClose} aria-label="Close" className="text-stone hover:text-ink transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="px-6 pb-28 overflow-y-auto max-h-[62dvh]">{children}</div>
    </div>
  )
}
