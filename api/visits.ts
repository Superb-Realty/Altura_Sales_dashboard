import { google } from 'googleapis'
import { config } from 'dotenv'
import { authenticate } from './auth-utils.js'

config({ path: '.env.local', quiet: true })
const number = (value: unknown) => Number(String(value ?? '').replace(/,/g, '')) || 0

async function handleVisitsRequest(request: Request) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } })
  const user = await authenticate(request)
  if (user instanceof Response) return user
  let c: { client_email?: string; private_key?: string; sheet_id?: string } = {}
  try { c = JSON.parse(process.env.GOOGLE_SHEETS_CONFIG || '{}') } catch { return Response.json({ error: 'GOOGLE_SHEETS_CONFIG is not valid JSON.' }, { status: 503 }) }
  const email = c.client_email || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = (c.private_key || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n')
  const sheetId = c.sheet_id || process.env.GOOGLE_SHEET_ID
  if (!email || !key || !sheetId) return Response.json({ error: 'Server data source is not configured.' }, { status: 503 })
  try {
    const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
    const sheets = google.sheets({ version: 'v4', auth })
    const tabs = ['Site_Visits!A1:C20', "'MoM_Visits_(last_6_Months)'!A1:C20", "'WoW_Visits_(Last_8_Weeks)'!A1:D20", 'CP_Meetings!A1:B20', "'MoM_CP_Meetings_(last_6_Months)'!A1:C20", 'Top_10_CPs!A1:F20']
    const responses = await Promise.all(tabs.map((range) => sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })))
    const values = responses.map((response) => response.data.values ?? [])
    const siteVisits = values[0].slice(1).map((row) => ({ period: row[0], fresh: number(row[1]), revisits: number(row[2]) }))
    const momVisits = values[1].slice(1).reverse().map((row) => ({ period: String(row[0]).trim().split(' ')[0].slice(0, 3), fresh: number(row[1]), revisits: number(row[2]) }))
    const wowVisits = values[2].slice(1).reverse().map((row) => { const [day, month] = String(row[0]).split(' '); return { period: `${day} ${month.slice(0, 3)}`, fresh: number(row[2]), revisits: number(row[3]) } })
    const cpMeetings = values[3].map((row) => ({ period: row[0], meetings: number(row[1]) }))
    const momCpMeetings = values[4].slice(1).reverse().map((row) => ({ period: String(row[0]).trim().split(' ')[0].slice(0, 3), meetings: number(row[1]), toDate: number(row[2]) }))
    return Response.json({ siteVisits, momVisits, wowVisits, cpMeetings, momCpMeetings, topCps: values[5] }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { console.error('Visits data request failed', error); return Response.json({ error: 'Unable to load visits analysis data.' }, { status: 502 }) }
}
export default { fetch: handleVisitsRequest }
