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
    const tabs = ['Site_Visits!A1:C20', "'MoM_Visits_(last_6_Months)'!A1:C20", "'WoW_Visits_(Last_8_Weeks)'!A1:D20", 'CP_Meetings!A1:B20', "'MoM_CP_Meetings_(last_6_Months)'!A1:Z20", 'Top_10_CPs!A1:Z20', 'Active_CPs_LTD!A1:Z1000', 'Active_CPs_28_Days!A1:Z1000', 'Top_10_CPs_28_Days!A1:Z20']
    const responses = await Promise.all(tabs.map((range) => sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })))
    const values = responses.map((response) => response.data.values ?? [])
    const siteVisits = values[0].slice(1).map((row) => ({ period: row[0], fresh: number(row[1]), revisits: number(row[2]) }))
    const momVisits = values[1].slice(1).reverse().map((row) => ({ period: String(row[0]).trim().split(' ')[0].slice(0, 3), fresh: number(row[1]), revisits: number(row[2]) }))
    const wowVisits = values[2].slice(1).reverse().map((row) => { const [day, month] = String(row[0]).split(' '); return { period: `${day} ${month.slice(0, 3)}`, fresh: number(row[2]), revisits: number(row[3]) } })
    const cpMeetings = values[3].map((row) => ({ period: row[0], meetings: number(row[1]) }))
    const momCpHeaders = (values[4][0] ?? []).map((header) => String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
    const freshIndex = momCpHeaders.findIndex((header) => header.includes('fresh'))
    const followUpsIndex = momCpHeaders.findIndex((header) => header.includes('follow'))
    const momCpRows = values[4].slice(1).reverse()
    const momCpMeetings = momCpRows.map((row) => ({ period: String(row[0]).trim().split(' ')[0].slice(0, 3), meetings: number(row[1]), toDate: number(row[2]) }))
    const momCpMeetingMix = momCpRows.map((row) => ({ period: String(row[0]).trim().split(' ')[0].slice(0, 3), fresh: freshIndex >= 0 ? number(row[freshIndex]) : 0, followUps: followUpsIndex >= 0 ? number(row[followUpsIndex]) : 0 }))
    return Response.json({ siteVisits, momVisits, wowVisits, cpMeetings, momCpMeetings, momCpMeetingMix, topCps: values[5], activeCpsLtd: values[6], activeCps28Days: values[7], topCps28Days: values[8] }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { console.error('Visits data request failed', error); return Response.json({ error: 'Unable to load visits analysis data.' }, { status: 502 }) }
}
export default { fetch: handleVisitsRequest }
