import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LogOut, Moon, RefreshCw, Sun } from 'lucide-react'
import { demoSalesRows, type SalesRow } from './lib/sales-data'
import superbLogo from './assets/Superb_logo/superb.jpeg'
import AuthGate from './AuthGate'
import './App.css'

const fmt = new Intl.NumberFormat('en-IN')
const metricDefs: { label: string; key: keyof Omit<SalesRow, 'month'>; unit?: string }[] = [
  { label: 'CP Meetings', key: 'meetings' }, { label: 'Total Visits', key: 'visits' },
  { label: 'EOI Units', key: 'units' }, { label: 'EOI Area', key: 'area', unit: 'sq ft' },
]
const lineLabel = { position: 'top' as const, offset: 12, fill: '#43297c', fontSize: 14, fontWeight: 700 }
const chartMargin = { top: 18, right: 12, left: -16, bottom: 0 }
const linePadding = { left: 18, right: 12 }
const monthOnly = (value: string | number) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value).replace(/\s+\d{4}$/, '') : new Intl.DateTimeFormat('en', { month: 'short' }).format(date)
}

export default function App() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const [rows, setRows] = useState<SalesRow[]>(demoSalesRows)
  const [live, setLive] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('amber-theme') === 'dark')
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('amber-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])
  const [status, setStatus] = useState('Connecting to your secure data source…')
  const refresh = async (force = false) => {
    if (!token) return
    try {
      // A manual refresh uses a unique URL so it cannot receive a cached
      // Vercel response. The scheduled refresh keeps the normal cache key.
      const endpoint = force ? `/api/sales?refresh=${Date.now()}` : '/api/sales'
      const response = await fetch(endpoint, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error()
      const result = await response.json() as { rows: SalesRow[] }
      if (!result.rows.length) throw new Error()
      setRows(result.rows); setLive(true)
      setStatus(`Private Google Sheet · refreshed ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
    } catch { setLive(false); setStatus('Secure data source is not configured yet — demo data shown.') }
  }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 60000); return () => clearInterval(timer) }, [token])
  const signOut = () => {
    window.google?.accounts.id.disableAutoSelect()
    setToken(null); setUser(null); setLive(false)
  }
  if (!token || !user) return <AuthGate onAuthenticated={(newToken, newUser) => { setToken(newToken); setUser(newUser) }} />
  const current = rows.at(-1) ?? demoSalesRows.at(-1)!
  const previous = rows.at(-2) ?? current
  const reportPeriod = /\d{4}/.test(current.month) ? current.month : `${current.month} 2026`
  const data = rows.map((row) => ({ ...row, areaK: +(row.area / 1000).toFixed(1) }))
  const metricCards = metricDefs.map((metric) => {
    const value = current[metric.key], old = previous[metric.key]
    const delta = old ? ((value - old) / old) * 100 : 0
    return <article className="metric" key={metric.key}><p>{metric.label}</p><strong>{fmt.format(value)} {metric.unit && <small>{metric.unit}</small>}</strong><div><span className={delta < 0 ? 'negative' : ''}>{delta < 0 ? '▼' : '▲'} {Math.abs(delta).toFixed(2)}%</span><em>vs {fmt.format(old)} ({previous.month})</em></div></article>
  })
  return <main className="dashboard">
    <header className="hero"><img className="brand-logo" src={superbLogo} alt="Superb Realty" /><h1><em>Amber</em> {reportPeriod} Sales Report</h1><p>Performance summary · {reportPeriod}</p></header>
    <div className="toolbar"><span><i className={live ? 'lamp live' : 'lamp'} />{status}</span><div><span className="private">{user.email}</span><button onClick={() => setDarkMode((value) => !value)} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} theme`} title={`Switch to ${darkMode ? 'light' : 'dark'} theme`}>{darkMode ? <Sun size={15} /> : <Moon size={15} />}{darkMode ? 'Light' : 'Dark'}</button><button onClick={() => refresh(true)}><RefreshCw size={15} />Refresh</button><button onClick={signOut}><LogOut size={15} />Sign out</button></div></div>
    <section className="metrics">{metricCards}</section>
    <h2 className="section-title">Monthly Trends</h2>
    <section className="charts">
      <article><h3>CP Meetings</h3><ResponsiveContainer width="100%" height={235}><LineChart data={data} margin={chartMargin}><CartesianGrid vertical={false} /><XAxis dataKey="month" padding={linePadding} tickFormatter={monthOnly} /><YAxis /><Tooltip /><Line dataKey="meetings" stroke="#43297c" strokeWidth={3} dot={{ r: 4 }} label={lineLabel} /></LineChart></ResponsiveContainer></article>
      <article><h3>Total Visits</h3><ResponsiveContainer width="100%" height={235}><LineChart data={data} margin={chartMargin}><CartesianGrid vertical={false} /><XAxis dataKey="month" padding={linePadding} tickFormatter={monthOnly} /><YAxis /><Tooltip /><Line dataKey="visits" stroke="#43297c" strokeWidth={3} dot={{ r: 4 }} label={lineLabel} /></LineChart></ResponsiveContainer></article>
      <article><h3>EOI</h3><ResponsiveContainer width="100%" height={235}><BarChart data={data} margin={chartMargin}><CartesianGrid vertical={false} /><XAxis dataKey="month" tickFormatter={monthOnly} /><YAxis yAxisId="units" /><YAxis yAxisId="area" orientation="right" tickFormatter={(value) => `${value}k`} /><Tooltip /><Bar yAxisId="units" dataKey="units" fill="#43297c" radius={[4, 4, 0, 0]} /><Bar yAxisId="area" dataKey="areaK" fill="#c8b27f" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer><p className="legend"><span>● EOI Units</span><span>● EOI Area (sq ft)</span></p></article>
    </section>
    <footer className="brand">Superb Realty · Sales &amp; Marketing Analytics</footer>
  </main>
}
