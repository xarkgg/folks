import { useRef, useState } from 'react'
import { ChevronRight, Check } from 'lucide-react'
import { buzz } from '../lib/alive.js'

// swipe-right-to-confirm slider — completes at 85% travel, springs back otherwise
export default function SwipeConfirm({ label = 'Swipe right to confirm', onConfirm, disabled = false }) {
  const trackRef = useRef(null)
  const [dx, setDx] = useState(0)
  const [done, setDone] = useState(false)
  const dragging = useRef(false)

  const max = () => (trackRef.current ? trackRef.current.clientWidth - 64 : 220)

  const move = (clientX) => {
    if (!dragging.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.min(Math.max(clientX - rect.left - 32, 0), max())
    setDx(x)
    if (x >= max() * 0.85) {
      dragging.current = false
      setDone(true)
      setDx(max())
      buzz(20)
      onConfirm?.()
    }
  }

  const end = () => {
    if (!dragging.current) return
    dragging.current = false
    setDx(0)
  }

  return (
    <div
      ref={trackRef}
      className="relative h-16 rounded-full bg-fog overflow-hidden select-none"
      style={{ touchAction: 'none' }}
    >
      {/* fill */}
      <div
        className="absolute inset-y-0 left-0 bg-success/25 rounded-full"
        style={{ width: dx + 32 }}
      />
      {/* label */}
      <div
        className="absolute inset-0 grid place-items-center text-stone text-sm font-medium transition-opacity"
        style={{ opacity: dx > 40 ? 0 : 1 }}
      >
        {label}
      </div>
      {/* thumb */}
      <div
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((dx / max()) * 100)}
        aria-label={label}
        onPointerDown={(e) => {
          if (disabled || done) return
          dragging.current = true
          e.target.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => move(e.clientX)}
        onPointerUp={end}
        onPointerCancel={end}
        className={`absolute top-2 left-2 w-12 h-12 rounded-full grid place-items-center shadow-md transition-colors ${
          done ? 'bg-success text-white' : 'bg-white text-stone cursor-grab active:cursor-grabbing'
        }`}
        style={{ transform: `translateX(${dx}px)`, transition: dragging.current ? 'none' : 'transform .25s ease' }}
      >
        {done ? (
          <Check className="w-6 h-6 pop-in" strokeWidth={2.5} />
        ) : (
          <ChevronRight className="w-5 h-5" strokeWidth={2} />
        )}
      </div>
    </div>
  )
}
