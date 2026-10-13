import { useEffect, useState } from 'react'
import Dashboard from './screens/Dashboard.jsx'
import SupportPage from './screens/SupportFlow.jsx'

// path router: '/' → creator dashboard, '/:username' → public support page
function usePath() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const onPop = () => setPath(location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return path
}

export default function App() {
  const path = usePath()
  const username = path.replace(/^\/+/, '').split('/')[0]
  const Screen = username ? <SupportPage username={username} /> : <Dashboard />
  return <div key={username || 'dashboard'} className="page-in">{Screen}</div>
}
