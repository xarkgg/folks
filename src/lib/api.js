// folks — API client.
// Session is an httpOnly cookie; unsafe requests carry the double-submit CSRF
// token from the `folks_csrf` cookie (adjust the name to match server/security/session.js).

const BASE = import.meta.env.VITE_API_BASE ?? '/api'
const CSRF_COOKIE = 'folks_csrf'

function csrfToken() {
  const m = document.cookie.match(new RegExp('(?:^|; )' + CSRF_COOKIE + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : ''
}

async function req(path, { method = 'GET', body } = {}) {
  const unsafe = !['GET', 'HEAD'].includes(method)
  const res = await fetch(BASE + path, {
    method,
    credentials: 'same-origin',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(unsafe ? { 'x-csrf-token': csrfToken() } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  session:        () => req('/auth/session'),
  logout:         () => req('/auth/logout', { method: 'POST' }),
  dashboard:      () => req('/me/dashboard'),
  creatorPage:    (username) => req(`/pages/${encodeURIComponent(username)}`),
  createSupport:  (username, payload) => req(`/pages/${encodeURIComponent(username)}/supports`, { method: 'POST', body: payload }),
  paymentStatus:  (reference) => req(`/payments/${encodeURIComponent(reference)}`),
  requestWithdrawal: (amountKobo) => req('/me/withdrawals', { method: 'POST', body: { amountKobo } }),
  config:         () => req('/config'),
}
