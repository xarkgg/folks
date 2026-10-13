// folks — money math. Integer kobo everywhere, naira only at the edge.

export function koboToNaira(kobo) {
  return (Number(kobo) / 100).toFixed(2)
}

// ₦1,234.50 — decimals shown only when non-zero (kobo tips are usually round)
export function formatNaira(kobo, { sign = false } = {}) {
  const negative = kobo < 0
  const abs = Math.abs(Math.round(kobo))
  const naira = Math.floor(abs / 100)
  const k = abs % 100
  const grouped = String(naira).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const decimals = k === 0 ? '' : '.' + String(k).padStart(2, '0')
  const s = sign ? (negative ? '−' : '+') : ''
  return `${s}₦${grouped}${decimals}`
}

// Safe evaluator for the numpad expression (tokens: numbers + - × ÷)
// No eval(). Standard precedence, left-associative.
export function evaluateExpression(tokens) {
  const out = [], ops = []
  const prec = { '+': 1, '-': 1, '×': 2, '÷': 2 }
  const apply = () => {
    const op = ops.pop(), b = out.pop(), a = out.pop()
    if (a == null || b == null || !op) throw new Error('bad expression')
    let r
    switch (op) {
      case '+': r = a + b; break
      case '-': r = a - b; break
      case '×': r = a * b; break
      case '÷':
        if (b === 0) throw new Error('division by zero')
        r = a / b
        break
    }
    out.push(r)
  }
  for (const t of tokens) {
    if (typeof t === 'number') out.push(t)
    else {
      while (ops.length && prec[ops[ops.length - 1]] >= prec[t]) apply()
      ops.push(t)
    }
  }
  while (ops.length) apply()
  if (out.length !== 1 || !isFinite(out[0])) throw new Error('bad expression')
  return out[0]
}
