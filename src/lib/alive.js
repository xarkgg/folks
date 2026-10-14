import { useEffect, useRef, useState } from 'react'

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

export function useCountUp(target = 0, { duration = 1100, delay = 200 } = {}) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    // A one-second counting number is exactly the kind of motion that triggers
    // vestibular discomfort, and no CSS media query can reach it. Snap instead.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setValue(target)
      return
    }

    const startAt = performance.now()
    const step = (now) => {
      const elapsed = now - startAt - delay
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(step)
        return
      }
      const t = Math.min(1, elapsed / duration)
      setValue(Math.round(target * easeOutExpo(t)))
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, delay])

  return value
}

export function buzz(pattern) {
  try {
    if ('vibrate' in navigator) {
      if (Array.isArray(pattern)) {
        navigator.vibrate(pattern)
      } else if (typeof pattern === 'number') {
        navigator.vibrate(pattern)
      }
    }
  } catch {}
}
