import { useEffect, useRef, useState } from 'react'

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

export function useCountUp(target = 0, { duration = 1100, delay = 200 } = {}) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    let started = false
    const start = () => {
      started = true
      startRef.current = performance.now()
      const step = (now) => {
        const elapsed = now - startRef.current - delay
        if (elapsed < 0) {
          rafRef.current = requestAnimationFrame(step)
          return
        }
        const t = Math.min(1, elapsed / duration)
        const eased = easeOutExpo(t)
        setValue(Math.round(target * eased))
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step)
        }
      }
      rafRef.current = requestAnimationFrame(step)
    }
    const id = setTimeout(start, 0)
    return () => {
      clearTimeout(id)
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
