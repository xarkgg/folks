import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { mockDashboard, withMock } from '../lib/mock.js'
import { formatNaira } from '../lib/money.js'
import AvatarStack from '../components/AvatarStack.jsx'
import BottomNav from '../components/BottomNav.jsx'
import Sheet from '../components/Sheet.jsx'
import Menu from '../components/Menu.jsx'
import { ArrowUp, Bell, Link2, RefreshCw, LogOut, ListFilter, Search } from 'lucide-react'

const DOTS = ['bg-candy-teal', 'bg-candy-yellow', 'bg-candy-blue']

function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// normalize the real /api/me/dashboard payload; falls back to mock keys.
// adjust here once you see the actual response shape.
function normalize(d) {
  const recent = (d.recentSupport ?? d.recent ?? []).map((r) => ({
    id: r.id ?? r.paymentId,
    name: r.supporter?.name ?? r.name ?? 'Supporter',
    note: r.note ?? r.message ?? null,
    amountKobo: r.amountKobo ?? r.amount_kobo ?? 0,
    ts: r.createdAt ? new Date(r.createdAt).getTime() : (r.ts ?? Date.now()),
    hue: r.supporter?.hue ?? ((r.id ?? '').length * 47) % 360,
  }))
  return {
    displayName: d.creator?.displayName ?? d.displayName ?? 'Creator',
    username: d.creator?.username ?? d.username ?? 'you',
    balanceKobo: d.balanceKobo ?? d.balance?.availableKobo ?? 0,
    monthKobo: d.monthKobo ?? d.stats?.monthKobo ?? 0,
    supporters: d.supportersMonth ?? d.stats?.supportersMonth ?? recent.length,
    recent,
  }
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [nav, setNav] = useState('home')
  const [sheet, setSheet] = useState(null)       // 'withdraw' | 'people' | 'cards' | 'settings'
  const [copied, setCopied] = useState(false)
  const [wd, setWd] = useState({ amount: '', busy: false, msg: '' })
  const [q, setQ] = useState('')

  useEffect(() => {
    withMock(async () => normalize(await api.dashboard()), () => normalize(mockDashboard)).then(setData)
  }, [])

  const supporters = useMemo(() => (data?.recent ?? []).map((r, i) => ({ id: r.id, name: r.name, hue: r.hue })), [data])
  const pageUrl = data ? `${location.origin}/${data.username}` : ''

  const share = async () => {
    try { await navigator.clipboard.writeText(pageUrl) } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  const menuItems = [
    { icon: <Link2 className="w-5 h-5" strokeWidth={2} />,
      label: 'Copy page link', onClick: share },
    { icon: <RefreshCw className="w-5 h-5" strokeWidth={2} />,
      label: 'Refresh', onClick: () => location.reload() },
    { icon: <LogOut className="w-5 h-5" strokeWidth={2} />,
      label: 'Sign out', danger: true,
      onClick: async () => { try { await api.logout() } catch {} location.href = '/' } },
  ]

  if (!data) {
    return <div className="app-canvas grid place-items-center min-h-dvh text-mist text-sm">Loading…</div>
  }

  const requestWithdrawal = async () => {
    const naira = Number(wd.amount)
    if (!Number.isFinite(naira) || naira <= 0) return setWd({ ...wd, msg: 'Enter an amount' })
    setWd({ ...wd, busy: true, msg: '' })
    try {
      await api.requestWithdrawal(Math.round(naira * 100))
      setWd({ amount: '', busy: false, msg: 'Withdrawal requested ✓' })
    } catch (e) {
      setWd({ ...wd, busy: false, msg: e.message })
    }
  }

  return (
    <div className="app-canvas bg-ink text-sheet">
      {/* ── dark hero ── */}
      <header className="relative px-6 pt-14 pb-6">
        {/* peeking card stack — brand signature from the video */}
        <div className="absolute right-[-46px] top-[168px] flex gap-1.5 rotate-0" aria-hidden>
          {['bg-candy-yellow', 'bg-candy-teal', 'bg-candy-blue'].map((c) => (
            <div key={c} className={`w-[54px] h-[118px] rounded-l-2xl ${c}`} />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-candy-yellow to-[#ff9d2e] grid place-items-center font-semibold text-ink">
            {data.displayName[0]?.toUpperCase()}
          </div>
          <div className="flex items-center gap-2.5">
          <button aria-label="Notifications" className="bubble bubble-pill relative w-11 h-11 grid place-items-center text-mist">
            <Bell className="w-5 h-5" strokeWidth={2} />
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-candy-yellow" />
            </button>
            <Menu trigger={(
              <button aria-label="More" className="bubble bubble-pill w-11 h-11 grid place-items-center text-mist">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><circle cx="12" cy="5.5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="18.5" r="1.6"/></svg>
              </button>
            )} items={menuItems} />
          </div>
        </div>

        <p className="mt-8 text-mist text-sm">Total balance</p>
        <h1 className="font-display tnum text-[44px] leading-tight mt-1">
          {formatNaira(data.balanceKobo)}
        </h1>

        <div className="mt-5 flex gap-3">
          <button
            onClick={() => setSheet('withdraw')}
            className="h-11 px-5 rounded-full bg-sheet text-ink font-medium flex items-center gap-2"
          >
            <ArrowUp className="w-4 h-4" strokeWidth={2.2} />
            Withdraw
          </button>
          <button
            onClick={share}
            className="bubble bubble-pill h-11 px-5 text-sheet font-medium"
          >
            {copied ? 'Link copied ✓' : 'Share page'}
          </button>
        </div>

        {/* month card */}
        <div className="bubble mt-8 mr-14 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-mist text-sm">This month</p>
              <p className="font-display tnum text-2xl mt-0.5">{formatNaira(data.monthKobo)}</p>
            </div>
            <AvatarStack people={supporters} max={4} />
          </div>
          <p className="text-mist text-xs mt-3">{data.supporters} supporters this month</p>
        </div>
      </header>

      {/* ── transactions sheet ── */}
      <main className="sheet-enter absolute inset-x-0 bottom-0 z-20 rounded-t-[2rem] bg-sheet shadow-sheet">
        <div className="pt-3 pb-1 grid place-items-center"><div className="w-10 h-1.5 rounded-full bg-fog" /></div>
        <div className="flex items-center justify-between px-6 pt-2 pb-3">
          <h2 className="text-lg font-medium text-ink">Recent support</h2>
          <div className="flex gap-4 text-stone">
            <ListFilter className="w-5 h-5" strokeWidth={2} />
                      </div>
        </div>
        <div className="px-6 pb-3">
          <div className="bubble-light bubble-pill flex items-center gap-2.5 px-4 h-10">
            <Search className="w-4 h-4 text-stone" strokeWidth={2} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search supporters"
              className="bg-transparent flex-1 outline-none text-sm text-ink placeholder:text-stone/70" />
          </div>
        </div>
        <ul className="px-6 pb-32 space-y-1 overflow-y-auto max-h-[40dvh]">
          {data.recent.filter((r) =>
            !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.note ?? '').toLowerCase().includes(q.toLowerCase())
          ).map((r, i) => (
            <li key={r.id} className="flex items-center gap-4 py-3 px-3 -mx-3 rounded-2xl transition-colors hover:bg-fog">
              <div className="relative">
                <div
                  className="w-11 h-11 rounded-full grid place-items-center text-white font-medium"
                  style={{ background: `linear-gradient(135deg, hsl(${r.hue} 60% 45%), hsl(${r.hue + 40} 65% 38%))` }}
                >
                  {r.name[0]?.toUpperCase()}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-sheet ${DOTS[i % 3]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-ink font-medium truncate">{r.name}</p>
                <p className="text-stone text-sm truncate">{r.note ?? timeAgo(r.ts)}</p>
              </div>
              <span className="tnum font-medium text-ink">{formatNaira(r.amountKobo, { sign: true })}</span>
            </li>
          ))}
          {data.recent.length === 0 && (
            <li className="py-10 text-center text-stone text-sm">No support yet — share your page!</li>
          )}
        </ul>
      </main>

      <BottomNav active={nav} onChange={(k) => { setNav(k); if (k !== 'home') setSheet(k) }} />

      {/* ── secondary sheets ── */}
      {sheet === 'withdraw' && (
        <Sheet title="Withdraw" onClose={() => setSheet(null)}>
          <p className="text-stone text-sm">Available <span className="tnum text-ink font-medium">{formatNaira(data.balanceKobo)}</span></p>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-fog px-4 h-14">
            <span className="text-ink text-lg font-medium">₦</span>
            <input
              value={wd.amount}
              onChange={(e) => setWd({ ...wd, amount: e.target.value.replace(/[^\d.]/g, '') })}
              inputMode="decimal"
              placeholder="0"
              className="tnum bg-transparent flex-1 outline-none text-ink text-lg placeholder:text-stone/60"
            />
          </div>
          {wd.msg && <p className="mt-3 text-sm text-stone">{wd.msg}</p>}
          <button
            onClick={requestWithdrawal}
            disabled={wd.busy}
            className="mt-5 w-full h-13 py-3.5 rounded-full bg-ink text-sheet font-medium disabled:opacity-60"
          >
            {wd.busy ? 'Requesting…' : 'Request withdrawal'}
          </button>
        </Sheet>
      )}
      {sheet && ['people', 'cards', 'settings'].includes(sheet) && (
        <Sheet
          title={{ people: 'Supporters', cards: 'Payout account', settings: 'Settings' }[sheet]}
          onClose={() => { setSheet(null); setNav('home') }}
        >
          <p className="text-stone text-sm py-8 text-center">
            {{ people: 'Full supporter list lands in the next pass.',
               cards: 'Bank payout + activation states wire up to /api/me here.',
               settings: 'Profile, goal and cup price — coming next pass.' }[sheet]}
          </p>
        </Sheet>
      )}
    </div>
  )
}
