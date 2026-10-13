import { useEffect, useState } from 'react'
import Dashboard from './screens/Dashboard.jsx'
import SupportPage from './screens/SupportFlow.jsx'

// path router: '/' → creator dashboard, '/:username' → public support page
function usePath() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const onPop = () => setPath(location.pathname)
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])
  return path
}

export default function App() {
  const path = usePath()
  const username = path.replace(/^\/+/, '').split('/')[0]
  return username ? <SupportPage username={username} /> : <Dashboard />
}
