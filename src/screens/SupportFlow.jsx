import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { mockPage, withMock } from '../lib/mock.js'
import { formatNaira } from '../lib/money.js'
import Numpad, { useAmountEntry } from '../components/Numpad.jsx'
import SwipeConfirm from '../components/SwipeConfirm.jsx'
import { Check } from 'lucide-react'

const PRESETS = [500, 1000, 2000, 5000]

function SuccessOverlay({ amountKobo, name, onClose }) {
  return (
    <div
      onClick={onClose}
      className="fade-in fixed inset-0 z-50 bg-success grid place-items-center cursor-pointer"
    >
      <div className="text-center text-white px-8">
        <Check className="w-16 h-16 mx-auto" strokeWidth={3} />
        <p className="font-display tnum text-5xl mt-6">{formatNaira(amountKobo)}</p>
        <p className="mt-3 text-white/90 text-lg">Sent to {name}</p>
      </div>
      <p className="absolute bottom-12 inset-x-0 text-center text-white/60 text-sm">Tap anywhere to close</p>
    </div>
  )
}

export default function SupportPage({ username }) {
  const [page, setPage] = useState(null)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState('amount') // amount | processing
  const [done, setDone] = useState(null)       // { amountKobo }
  const [err, setErr] = useState('')
  const entry = useAmountEntry()

  useEffect(() => {
    withMock(
      async () => {
        const p = await api.creatorPage(username)
        return {
          displayName: p.creator?.displayName ?? p.displayName ?? username,
          username,
          bio: p.bio ?? p.creator?.bio ?? '',
          goalNaira: p.goalNaira ?? (p.goal ? p.goal / 100 : null),
          receivedNaira: p.receivedNaira ?? (p.receivedKobo ? p.receivedKobo / 100 : 0),
          paymentsActive: p.paymentsActive ?? p.state === 'payments_active',
        }
      },
      () => ({ ...mockPage, username }),
    ).then(setPage)

    // returning from the provider checkout: ?reference=…
    const ref = new URLSearchParams(location.search).get('reference')
    if (ref) {
      api.paymentStatus(ref)
        .then((s) => s?.status === 'success' && setDone({ amountKobo: s.amountKobo ?? entryRefGuard() }))
        .catch(() => {})
    }
  }, [username])

  // amount is unknown on return-from-checkout without state; success screen
  // without an amount is still fine — handled below
  function entryRefGuard() { return 0 }

  if (!page) return <div className="app-canvas grid place-items-center min-h-dvh text-mist text-sm">Loading…</div>

  const naira = entry.naira()
  const kobo = Math.round(naira * 100)
  const goalPct = page.goalNaira ? Math.min(100, Math.round((page.receivedNaira / page.goalNaira) * 100)) : null

  const confirm = async () => {
    if (kobo <= 0) return
    setPhase('processing')
    setErr('')
    try {
      const r = await api.createSupport(page.username, { amountKobo: kobo })
      if (r?.checkoutUrl) {
        window.location.href = r.checkoutUrl   // off to Flutterwave
        return
      }
      // mock provider answered inline
      setDone({ amountKobo: kobo })
    } catch (e) {
      setErr(e.message)
      setPhase('amount')
    }
  }

  const closeAll = () => { setDone(null); setOpen(false); setPhase('amount'); entry.clear() }

  return (
    <div className="app-canvas flex h-dvh flex-col overflow-hidden bg-ink text-sheet">
      <div className="flex-none overflow-y-auto px-6 pt-16 pb-10 text-center">
        {/* working wordmark — swap when branding lands */}
        <p className="font-logo text-3xl mb-10">folks</p>

        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-candy-teal to-candy-blue grid place-items-center text-4xl font-semibold">
          {page.displayName[0]?.toUpperCase()}
        </div>
        <h1 className="mt-4 text-2xl font-medium">{page.displayName}</h1>
        <p className="text-mist mt-1">@{page.username}</p>
        {page.bio && <p className="text-mist text-sm mt-4 max-w-[30ch] mx-auto">{page.bio}</p>}

        {goalPct !== null && (
          <div className="mt-8 max-w-[260px] mx-auto">
            <div className="h-2 rounded-full bg-ink-3 overflow-hidden">
              <div className="h-full rounded-full bg-candy-teal transition-all" style={{ width: `${goalPct}%` }} />
            </div>
            <p className="tnum text-mist text-xs mt-2">
              ₦{page.receivedNaira.toLocaleString()} of ₦{page.goalNaira.toLocaleString()} this month
            </p>
          </div>
        )}

        {page.paymentsActive ? (
          <button
            onClick={() => setOpen(true)}
            className="mt-10 h-13 py-3.5 px-10 rounded-full bg-sheet text-ink font-semibold"
          >
            Support {page.displayName.split(' ')[0]}
          </button>
        ) : (
          <p className="mt-10 text-mist text-sm">This page isn't accepting payments yet.</p>
        )}
      </div>

      {/* ── support sheet ── */}
      {open && !done && (
        <div className="sheet-enter z-30 flex min-h-0 flex-1 flex-col rounded-t-[2rem] bg-sheet shadow-sheet">
          <div className="pt-3 pb-1 grid place-items-center"><div className="w-10 h-1.5 rounded-full bg-fog" /></div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
            <div className="text-center mt-2">
              <div className="bubble-light bubble-pill inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-candy-teal to-candy-blue grid place-items-center text-xs font-semibold text-white">
                  {page.displayName[0]?.toUpperCase()}
                </div>
                <span className="text-ink text-sm font-medium">{page.displayName} <span className="text-stone font-normal">· @{page.username}</span></span>
              </div>
            </div>

            {/* big amount — Gendy, like the video */}
            <p className="font-display tnum text-center text-[52px] leading-none mt-8 text-ink min-h-[52px]">
              ₦{entry.display()}
            </p>
            <p className="text-center text-stone text-sm mt-3 min-h-[20px]">
              {entry.display().includes('×') || entry.display().includes('÷') || entry.display().includes('+') || entry.display().includes('-')
                ? `= ${formatNaira(kobo)}`
                : ' '}
            </p>

            {/* presets */}
            <div className="flex gap-2 justify-center mt-4 no-scrollbar overflow-x-auto">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => { entry.clear(); String(n).split('').forEach(entry.digit) }}
                  className={naira === n
                    ? 'px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap bg-ink text-sheet'
                    : 'bubble-light bubble-pill px-4 h-9 text-sm font-medium whitespace-nowrap text-ink'}
                >
                  ₦{n.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="mt-6"><Numpad entry={entry} /></div>

            {err && <p className="text-center text-danger text-sm mt-4">{err}</p>}

            <div className="mt-6">
              <SwipeConfirm
                label={phase === 'processing' ? 'Processing…' : 'Swipe right to confirm'}
                disabled={kobo <= 0 || phase === 'processing'}
                onConfirm={confirm}
              />
            </div>
          </div>
        </div>
      )}

      {done && (
        <SuccessOverlay amountKobo={done.amountKobo} name={page.displayName} onClose={closeAll} />
      )}
    </div>
  )
}
