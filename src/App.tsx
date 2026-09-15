import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LogOut, Moon, RefreshCw, Sun } from 'lucide-react'
import { demoSalesRows, type SalesRow } from './lib/sales-data'
import superbLogo from './assets/Superb_logo/superb.jpeg'
import AuthGate from './AuthGate'
import './App.css'
import './inventory.css'

const fmt = new Intl.NumberFormat('en-IN')
type InventorySlice = { status: 'Booked' | 'EOI' | 'Blocked' | 'Open'; units: number; area: number }
type EoiBookedRow = { month: string; units: number; area: number }
type VisitTrend = { period: string; fresh: number; revisits: number }
type MeetingTrend = { period: string; meetings: number; toDate?: number }
type VisitsData = { siteVisits: VisitTrend[]; momVisits: VisitTrend[]; wowVisits: VisitTrend[]; cpMeetings: MeetingTrend[]; momCpMeetings: MeetingTrend[]; topCps: string[][] }
type VerticalSplitRow = { metric: string; cpPercent: number; directPercent: number; cp: number; direct: number; cpLabel: string; directLabel: string }
const lightInventoryColors = ['#43297C', '#C8B27F', '#76649D', '#E2D6BA']
const darkInventoryColors = ['#8F7AB9', '#CAB584', '#6F579F', '#E2D6BA']
const demoInventory: InventorySlice[] = [{ status: 'Booked', units: 25, area: 20250 }, { status: 'EOI', units: 21, area: 21919 }, { status: 'Blocked', units: 12, area: 8871 }, { status: 'Open', units: 93, area: 89259 }]
type Session = { token: string; user: { email: string; name: string }; createdAt: number }
const SESSION_KEY = 'amber-dashboard-session'
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000
const readSession = (): Session | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as Session | null
    if (saved && Date.now() - saved.createdAt < SESSION_MAX_AGE) return saved
    localStorage.removeItem(SESSION_KEY)
  } catch { localStorage.removeItem(SESSION_KEY) }
  return null
}
function FloorTable({ title, rows }: { title: string; rows: string[][] }) {
  if (!rows.length) return null
  const conditionalColumns = new Set(rows[0].map((header, index) => ({ header: header.toLowerCase().replace(/\s/g, ''), index })).filter(({ header }) => header === '%booked' || header === '%booked+eoi').map(({ index }) => index))
  const bandClass = (value: string) => {
    const percent = parseFloat(value)
    if (Number.isNaN(percent)) return ''
    if (percent <= 20) return 'band-dark-red'
    if (percent <= 40) return 'band-light-red'
    if (percent <= 60) return 'band-yellow'
    if (percent <= 80) return 'band-light-green'
    return 'band-dark-green'
  }
  return <section className="floor-table-section"><h2 className="section-title">{title}</h2>{conditionalColumns.size > 0 && <p className="table-insight conditional-format-legend"></p>}<div className="floor-table-wrap"><table className="floor-table"><thead><tr>{rows[0].map((cell, index) => <th key={`${cell}-${index}`}>{cell}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, rowIndex) => <tr key={rowIndex} className={row[0]?.toLowerCase() === 'total' ? 'total-row' : ''}>{rows[0].map((_, index) => { const value = row[index] ?? '—'; return <td key={index}>{index === 0 ? <span className="floor-label">{value}</span> : conditionalColumns.has(index) ? <span className={`performance-band ${bandClass(value)}`}>{value}</span> : value}</td> })}</tr>)}</tbody></table></div></section>
}
function VisitsAreaChart({ title, data }: { title: string; data: VisitTrend[] }) {
  const key = title.toLowerCase().replace(/[^a-z0-9]/g, '-')
  const visible = (value: unknown) => Number(value) === 0 ? '' : fmt.format(Number(value))
  return <article><h3>{title}</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={data} margin={{ top: 24, right: 12, left: -18, bottom: 6 }}><defs><linearGradient id={`fresh-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#43297C" stopOpacity={.38}/><stop offset="95%" stopColor="#43297C" stopOpacity={.04}/></linearGradient><linearGradient id={`revisit-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C8B27F" stopOpacity={.52}/><stop offset="95%" stopColor="#C8B27F" stopOpacity={.05}/></linearGradient></defs><CartesianGrid vertical={false}/><XAxis dataKey="period" interval={0} tick={{ fontSize: 10 }}/><YAxis/><Tooltip/><Area type="monotone" dataKey="fresh" name="Fresh Visits" stroke="#43297C" strokeWidth={3} fill={`url(#fresh-${key})`} isAnimationActive={false}><LabelList dataKey="fresh" position="top" formatter={visible} className="chart-value fresh-value"/></Area><Area type="monotone" dataKey="revisits" name="Re-visits" stroke="#C8B27F" strokeWidth={3} fill={`url(#revisit-${key})`} isAnimationActive={false}><LabelList dataKey="revisits" position="bottom" formatter={visible} className="chart-value revisit-value"/></Area></AreaChart></ResponsiveContainer><p className="legend visits-legend"><span>● Fresh Visits</span><span>● Re-visits</span></p></article>
}
function MeetingsLineChart({ title, data, showToDate = false }: { title: string; data: MeetingTrend[]; showToDate?: boolean }) {
  return <article><h3>{title}</h3><ResponsiveContainer width="100%" height={250}><LineChart data={data} margin={{ top: 28, right: 15, left: -10, bottom: 4 }}><CartesianGrid vertical={false}/><XAxis dataKey="period"/><YAxis/><Tooltip/><Line type="monotone" dataKey="meetings" name="Meetings" stroke="#43297C" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 3 }} activeDot={{ r: 6 }} isAnimationActive={false}><LabelList dataKey="meetings" position="top" className="chart-value meetings-value"/></Line>{showToDate && <Line type="monotone" dataKey="toDate" name="Meetings to date" stroke="#C8B27F" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 3 }} activeDot={{ r: 6 }} isAnimationActive={false}><LabelList dataKey="toDate" position="bottom" className="chart-value to-date-value"/></Line>}</LineChart></ResponsiveContainer></article>
}
function VisitsKpis({ data }: { data: VisitsData }) {
  const latest = data.siteVisits.at(-1), previous = data.siteVisits.at(-2)
  const periodLabel = (period: string | undefined) => period?.trim().toLowerCase() === 'previous period' ? 'Previous 28 days Period' : period
  const change = (value: number, previous: number) => previous ? ((value - previous) / previous) * 100 : 0
  const cards = [
    { title: 'Fresh Visits', value: latest?.fresh ?? 0, previous: previous?.fresh ?? 0, previousLabel: periodLabel(previous?.period), breakdown: data.siteVisits.map((row) => ({ label: periodLabel(row.period) ?? '', value: row.fresh })) },
    { title: 'Re-Visits', value: latest?.revisits ?? 0, previous: previous?.revisits ?? 0, previousLabel: periodLabel(previous?.period), breakdown: data.siteVisits.map((row) => ({ label: periodLabel(row.period) ?? '', value: row.revisits })) },
  ]
  return <section className="visits-kpis">{cards.map((card) => { const delta = change(card.value, card.previous); return <article key={card.title}><div className="kpi-primary"><p>{card.title}</p><strong>{fmt.format(card.value)}</strong><span className={delta < 0 ? 'down' : 'up'}>{delta < 0 ? '▼' : '▲'} {Math.abs(delta).toFixed(2)}%</span><small>vs {fmt.format(card.previous)} ({card.previousLabel})</small></div><div className="kpi-breakdown">{card.breakdown.map((item) => <p key={item.label}><span>{item.label}</span><strong>{fmt.format(item.value)}</strong></p>)}</div></article> })}</section>
}
function CpMeetingKpi({ data }: { data: VisitsData }) {
  const latest = data.momCpMeetings.at(-1), previous = data.momCpMeetings.at(-2)
  const value = latest?.meetings ?? 0, previousValue = previous?.meetings ?? 0
  const delta = previousValue ? ((value - previousValue) / previousValue) * 100 : 0
  const periodLabel = (period: string) => period.trim().toLowerCase() === 'previous period' ? 'Previous 28 days Period' : period
  return <section className="visits-kpis cp-meeting-kpi"><article><div className="kpi-primary"><p>CP Meetings</p><strong>{fmt.format(value)}</strong><span className={delta < 0 ? 'down' : 'up'}>{delta < 0 ? '▼' : '▲'} {Math.abs(delta).toFixed(2)}%</span><small>vs {fmt.format(previousValue)} ({previous?.period})</small></div><div className="kpi-breakdown">{data.cpMeetings.map((item) => <p key={item.period}><span>{periodLabel(item.period)}</span><strong>{fmt.format(item.meetings)}</strong></p>)}</div></article></section>
}

export default function App() {
  const [session, setSession] = useState<Session | null>(readSession)
  const token = session?.token ?? null
  const user = session?.user ?? null
  const [rows, setRows] = useState<SalesRow[]>(demoSalesRows)
  const [live, setLive] = useState(false)
  const [inventory, setInventory] = useState<InventorySlice[]>(demoInventory)
  const [inventorySummary, setInventorySummary] = useState<string[][]>([])
  const [floorStatement, setFloorStatement] = useState<string[][]>([])
  const [floorSummary, setFloorSummary] = useState<string[][]>([])
  const [configurationStatement, setConfigurationStatement] = useState<string[][]>([])
  const [eoiBooked, setEoiBooked] = useState<EoiBookedRow[]>(['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => ({ month, units: 0, area: 0 })))
  const [visits, setVisits] = useState<VisitsData | null>(null)
  const [verticalSplit, setVerticalSplit] = useState<VerticalSplitRow[]>([])
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('amber-theme') === 'dark')
  const inventoryColors = darkMode ? darkInventoryColors : lightInventoryColors
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('amber-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])
  const [status, setStatus] = useState('Connecting to your secure data source…')
  const refresh = async (force = false) => {
    if (!token) return
    const request = (path: string) => fetch(force ? `${path}?refresh=${Date.now()}` : path, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } })
    const results = await Promise.allSettled([request('/api/sales'), request('/api/inventory'), request('/api/floors'), request('/api/configuration'), request('/api/eoi-booked'), request('/api/visits'), request('/api/vertical-split')])
    let loaded = false
    const responseAt = (index: number) => results[index].status === 'fulfilled' && results[index].value.ok ? results[index].value : null
    const salesResponse = responseAt(0); if (salesResponse) { const result = await salesResponse.json() as { rows?: SalesRow[] }; if (result.rows?.length) { setRows(result.rows); loaded = true } }
    const inventoryResponse = responseAt(1); if (inventoryResponse) { const result = await inventoryResponse.json() as { slices?: InventorySlice[]; summary?: string[][] }; if (result.slices?.length) { setInventory(result.slices); loaded = true } if (result.summary?.length) setInventorySummary(result.summary) }
    const floorsResponse = responseAt(2); if (floorsResponse) { const result = await floorsResponse.json() as { statement?: string[][]; summary?: string[][] }; if (result.statement?.length) setFloorStatement(result.statement); if (result.summary?.length) setFloorSummary(result.summary); loaded ||= Boolean(result.statement?.length || result.summary?.length) }
    const configurationResponse = responseAt(3); if (configurationResponse) { const result = await configurationResponse.json() as { rows?: string[][] }; if (result.rows?.length) { setConfigurationStatement(result.rows); loaded = true } }
    const eoiResponse = responseAt(4); if (eoiResponse) { const result = await eoiResponse.json() as { rows?: EoiBookedRow[] }; if (result.rows?.length) { setEoiBooked(result.rows); loaded = true } }
    const visitsResponse = responseAt(5); if (visitsResponse) { const result = await visitsResponse.json() as VisitsData; if (result.siteVisits?.length) { setVisits(result); loaded = true } }
    const verticalResponse = responseAt(6); if (verticalResponse) { const result = await verticalResponse.json() as { rows?: VerticalSplitRow[] }; if (result.rows?.length) { setVerticalSplit(result.rows); loaded = true } }
    if (!loaded && results.some((result) => result.status === 'fulfilled' && result.value.status === 401)) { localStorage.removeItem(SESSION_KEY); setSession(null); return }
    setLive(loaded)
    setStatus(loaded ? `Private Google Sheet · refreshed ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Secure data source is not configured yet — demo data shown.')
  }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 60000); return () => clearInterval(timer) }, [token])
  const signOut = () => {
    window.google?.accounts.id.disableAutoSelect()
    setSession(null); localStorage.removeItem(SESSION_KEY); setLive(false)
  }
  if (!token || !user) return <AuthGate onAuthenticated={(newToken, newUser) => { const next = { token: newToken, user: newUser, createdAt: Date.now() }; localStorage.setItem(SESSION_KEY, JSON.stringify(next)); setSession(next) }} />
  const current = rows.at(-1) ?? demoSalesRows.at(-1)!
  const reportPeriod = /\d{4}/.test(current.month) ? current.month : `${current.month} 2026`
  return <main className="dashboard">
    <header className="hero"><img className="brand-logo" src={superbLogo} alt="Superb Realty" /><h1><em>Amber_Live</em> Sales Report</h1><p>Performance summary · {reportPeriod}</p></header>
    <div className="toolbar"><span><i className={live ? 'lamp live' : 'lamp'} />{status}</span><div><span className="private">{user.email}</span><button onClick={() => setDarkMode((value) => !value)} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} theme`} title={`Switch to ${darkMode ? 'light' : 'dark'} theme`}>{darkMode ? <Sun size={15} /> : <Moon size={15} />}{darkMode ? 'Light' : 'Dark'}</button><button onClick={() => refresh(true)}><RefreshCw size={15} />Refresh</button><button onClick={signOut}><LogOut size={15} />Sign out</button></div></div>
    <div className="sales-report-grid">
    <section className="charts eoi-booked-section"><article><h3>EOI + Booked · Apr–Dec '26</h3><ResponsiveContainer width="100%" height={285}><BarChart data={eoiBooked} margin={{ top: 28, right: 30, left: 12, bottom: 0 }}><CartesianGrid vertical={false} /><XAxis dataKey="month" /><YAxis yAxisId="units" label={{ value: '# Units', angle: -90, position: 'insideLeft' }} /><YAxis yAxisId="area" orientation="right" tickFormatter={(value) => fmt.format(value)} label={{ value: 'Area (sq ft)', angle: 90, position: 'insideRight' }} /><Tooltip formatter={(value: unknown, name: unknown) => [fmt.format(Number(value) || 0), name === 'units' ? 'Units' : 'Area (sq ft)']} /><Bar yAxisId="units" dataKey="units" fill="#43297C" radius={[5, 5, 0, 0]} isAnimationActive={false}><LabelList dataKey="units" position="top" formatter={(value: unknown) => Number(value) ? fmt.format(Number(value)) : ''} className="eoi-value-label units-label" /></Bar><Bar yAxisId="area" dataKey="area" fill="#C8B27F" radius={[5, 5, 0, 0]} isAnimationActive={false}><LabelList dataKey="area" position="top" formatter={(value: unknown) => Number(value) ? fmt.format(Number(value)) : ''} className="eoi-value-label area-label" /></Bar></BarChart></ResponsiveContainer><p className="legend eoi-booked-legend"><span>● Units</span><span>● Area (sq ft)</span></p></article></section>
    <div className="sales-inventory-panel"><h2 className="section-title inventory-title">Inventory Summary</h2>
    {inventorySummary.length > 0 && <div className="inventory-summary-wrap"><table className="inventory-summary-table"><thead><tr>{inventorySummary[0].map((cell, index) => <th key={index}>{cell}</th>)}</tr></thead><tbody>{inventorySummary.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{inventorySummary[0].map((_, index) => <td key={index}>{row[index] ?? ''}</td>)}</tr>)}</tbody></table></div>}
    <section className="charts inventory-section"><article className="inventory-card"><h3>Area-wise Inventory</h3><div className="inventory-content"><div><ResponsiveContainer width="100%" height={245}><PieChart><Pie data={inventory} dataKey="area" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={2} label={({ value, percent }) => `${fmt.format(Number(value) || 0)} | ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine isAnimationActive={false}>{inventory.map((slice, index) => <Cell key={slice.status} fill={inventoryColors[index]} />)}</Pie><Tooltip formatter={(value: unknown, _name: unknown, item: any) => [`${fmt.format(Number(value) || 0)} sq ft · ${fmt.format(item?.payload?.units ?? 0)} units`, 'Area']} /></PieChart></ResponsiveContainer><p className="legend inventory-legend">{inventory.map((slice, index) => <span key={slice.status} style={{ color: inventoryColors[index] }}>● {slice.status}</span>)}</p></div></div></article></section></div>
    <div className="sales-floor-statement"><FloorTable title="Floor Statement" rows={floorStatement} /></div>
    <div className="sales-floor-summary"><FloorTable title="Floor Summary" rows={floorSummary} /></div>
    <div className="sales-configuration"><FloorTable title="Configuration Statement" rows={configurationStatement} /></div>
    </div>
    {visits ? <div className="visits-page"><h2 className="section-title">Visits Analysis</h2><VisitsKpis data={visits}/><section className="charts visits-grid"><VisitsAreaChart title="Month-on-Month Visits" data={visits.momVisits}/><VisitsAreaChart title="Week-on-Week Visits" data={visits.wowVisits}/></section><h2 className="section-title visits-subtitle">CP Meeting Trends</h2><div className="cp-trends-row"><CpMeetingKpi data={visits}/><section className="charts meetings-grid"><MeetingsLineChart title="Month-on-Month CP Meetings" data={visits.momCpMeetings} showToDate/></section></div><FloorTable title="Top 10 CPs" rows={visits.topCps}/></div> : <section className="empty-state report-section">Visits data is loading. If this remains empty, sign out and sign in again.</section>}
    <div className="vertical-page"><h2 className="section-title">Vertical Split</h2>{verticalSplit.length ? <section className="charts vertical-chart"><article><h3>Sales Contribution</h3><ResponsiveContainer width="100%" height={310}><BarChart data={verticalSplit} margin={{ top: 24, right: 24, left: 10, bottom: 14 }}><CartesianGrid vertical={false}/><XAxis dataKey="metric"/><YAxis domain={[0,100]} ticks={[0,25,50,75,100]} tickFormatter={(value) => `${value}%`} label={{ value: 'Contribution', angle: -90, position: 'insideLeft' }}/><Tooltip formatter={(value: unknown, name: unknown, item: any) => [`${fmt.format(name === 'CP %' ? item.payload.cp : item.payload.direct)} (${Number(value).toFixed(2)}%)`, String(name)]} /><Bar dataKey="cpPercent" name="CP %" stackId="contribution" barSize={125} fill="#43297C" radius={[0,0,5,5]} isAnimationActive={false}><LabelList dataKey="cpLabel" position="center" className="split-label cp-split-label"/></Bar><Bar dataKey="directPercent" name="Direct %" stackId="contribution" barSize={125} fill="#C8B27F" radius={[5,5,0,0]} isAnimationActive={false}><LabelList dataKey="directLabel" position="center" className="split-label direct-split-label"/></Bar></BarChart></ResponsiveContainer><p className="legend split-legend"><span>● CP %</span><span>● Direct %</span></p></article></section> : <section className="empty-state">Vertical Split data is loading.</section>}</div>
    <footer className="brand">Superb Realty · Sales &amp; Marketing Analytics</footer>
  </main>
}
