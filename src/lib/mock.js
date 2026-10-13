// folks — mock data so the UI is demoable without the backend running.
// Any API failure falls back to these (see lib/api.js consumers).

export const mockDashboard = {
  creator: { username: 'papito', displayName: 'Papito', avatarHue: 18 },
  balanceKobo: 78544300,
  monthKobo: 13850000,
  supportersMonth: 6,
  recent: [
    { id: 'p1', name: 'Apple', note: 'For the drum kit video', amountKobo: 600000, ts: Date.now() - 3600e3 },
    { id: 'p2', name: 'Threads', note: 'Keep it rolling', amountKobo: 3000000, ts: Date.now() - 5 * 3600e3 },
    { id: 'p3', name: 'Apple', note: null, amountKobo: 20000000, ts: Date.now() - 26 * 3600e3 },
    { id: 'p4', name: 'Exoplan', note: null, amountKobo: 200000, ts: Date.now() - 49 * 3600e3 },
    { id: 'p5', name: 'Crunchyroll', note: 'Anime fund', amountKobo: 140000, ts: Date.now() - 72 * 3600e3 },
  ],
  activation: { kyc: 'approved', payout: 'verified', paymentsActive: true },
}

export const mockPage = {
  creator: { username: 'papito', displayName: 'Papito', avatarHue: 18 },
  goalNaira: 200000,          // monthly goal, from profile.goal
  receivedNaira: 138500,
  bio: 'Beats, breakdowns and the occasional hot take.',
  paymentsActive: true,
}

// mock mode is auto-enabled when the API is unreachable
export async function withMock(real, fallback) {
  try {
    return await real()
  } catch {
    return typeof fallback === 'function' ? fallback() : fallback
  }
}
