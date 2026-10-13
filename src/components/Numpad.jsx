import { useState } from 'react'
import { evaluateExpression } from '../lib/money.js'
import { Delete } from 'lucide-react'

// numpad with operator row — the "143 × 2 = 286" moment from the video.
// tokens: alternating [number, op, number, op, number ...]
export function useAmountEntry({ maxNaira = 1_000_000 } = {}) {
  const [tokens, setTokens] = useState([])   // completed operands/operators
  const [current, setCurrent] = useState('') // operand being typed, e.g. "143" or "12.5"

  const lastIsOperand = () => current !== '' || typeof tokens[tokens.length - 1] === 'number'

  const digit = (d) => {
    if (current.replace('.', '').length >= 7) return
    if (d === '.' && (current.includes('.') || current === '')) return
    setCurrent(current + d)
  }

  const op = (o) => {
    if (!lastIsOperand()) return                       // need an operand first
    const next = current !== '' ? [...tokens, Number(current), o] : [...tokens.slice(0, -1), o]
    setTokens(next); setCurrent('')
  }

  const equals = () => {
    if (!lastIsOperand()) return
    const all = current !== '' ? [...tokens, Number(current)] : tokens
    try {
      const result = evaluateExpression(all)
      const clamped = Math.min(Math.max(result, 0), maxNaira)
      setTokens([Number(clamped.toFixed(2))]); setCurrent('')
    } catch { /* leave state as-is on malformed input */ }
  }

  const backspace = () => {
    if (current !== '') setCurrent(current.slice(0, -1))
    else if (tokens.length) setTokens(tokens.slice(0, tokens.length - 1))
  }

  const clear = () => { setTokens([]); setCurrent('') }

  const display = () => {
    const parts = current !== '' ? [...tokens, current] : tokens
    return parts.map((t) => (typeof t === 'number' ? String(t) : t)).join(' ') || '0'
  }

  const naira = () => {
    const all = current !== '' ? [...tokens, Number(current)] : tokens
    if (!all.length) return 0
    try { return evaluateExpression(all) } catch { return 0 }
  }

  return { digit, op, equals, backspace, clear, display, naira }
}

const KEYS = [
  ['+', '-', '×', '÷'],
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
]

export default function Numpad({ entry }) {
  const press = (k) => {
    if (k === 'back') return entry.backspace()
    if (k === '=') return entry.equals()
    if (['+', '-', '×', '÷'].includes(k)) return entry.op(k)
    entry.digit(k)
  }

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[300px] mx-auto">
      {KEYS.flat().map((k) =>
        k === '=' ? null : (
          <button
            key={k}
            onClick={() => press(k)}
            className={`key h-14 text-xl text-ink grid place-items-center ${['+', '-', '×', '÷'].includes(k) ? 'key-op' : 'font-medium'}`}
          >
            {k === 'back' ? (
              <Delete className="w-6 h-6" strokeWidth={1.8} />
            ) : k}
          </button>
        )
      )}
      <button
        onClick={() => entry.equals()}
        aria-label="Equals"
        className="key key-op h-14 text-2xl grid place-items-center"
      >=</button>
    </div>
  )
}
