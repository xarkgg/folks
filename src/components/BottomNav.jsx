import { House, Users, CreditCard, Settings } from 'lucide-react'

// floating pill navigation — dark rounded pill, white circle on the active item.
// active icon renders as a solid silhouette (fill trick in lieu of a fill weight).
const items = [
  { key: 'home', label: 'Home', Icon: House },
  { key: 'people', label: 'Supporters', Icon: Users },
  { key: 'cards', label: 'Payout', Icon: CreditCard },
  { key: 'settings', label: 'Settings', Icon: Settings },
]

export default function BottomNav({ active = 'home', onChange }) {
  return (
    <nav className="fixed bottom-5 inset-x-0 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-[#101f22]/95 p-1.5 shadow-nav backdrop-blur">
        {items.map(({ key, label, Icon }) => {
          const isActive = key === active
          return (
            <button
              key={key}
              onClick={() => onChange?.(key)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`press grid place-items-center w-12 h-12 rounded-full transition-all duration-200 ${
                isActive ? 'bg-sheet text-ink scale-105' : 'text-mist hover:text-sheet'
              }`}
            >
              <Icon
                className="w-5 h-5"
                strokeWidth={isActive ? 0 : 2}
                fill={isActive ? 'currentColor' : 'none'}
              />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
