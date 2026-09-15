import { google } from 'googleapis'
import { config } from 'dotenv'
import { authenticate } from './auth-utils.js'

config({ path: '.env.local', quiet: true })
type InventorySlice = { status: 'Booked' | 'EOI' | 'Blocked' | 'Open'; units: number; area: number }
const number = (value: unknown) => Number(String(value ?? '').replace(/,/g, '')) || 0

async function handleInventoryRequest(request: Request) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } })
  const user = await authenticate(request)
  if (user instanceof Response) return user
  let combinedConfig: { client_email?: string; private_key?: string; sheet_id?: string } = {}
  try { if (process.env.GOOGLE_SHEETS_CONFIG) combinedConfig = JSON.parse(process.env.GOOGLE_SHEETS_CONFIG) }
  catch { return Response.json({ error: 'GOOGLE_SHEETS_CONFIG is not valid JSON.' }, { status: 503 }) }
  const email = combinedConfig.client_email || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = (combinedConfig.private_key || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n')
  const sheetId = combinedConfig.sheet_id || process.env.GOOGLE_SHEET_ID
  if (!email || !privateKey || !sheetId) return Response.json({ error: 'Server data source is not configured.' }, { status: 503 })
  try {
    const auth = new google.auth.JWT({ email, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
    const sheets = google.sheets({ version: 'v4', auth })
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Inventory_Summary!A1:F3' })
    const values = response.data.values ?? []
    const headers = values[0] ?? []
    const units = values.find((row) => String(row[0]).trim().toLowerCase() === 'units') ?? []
    const area = values.find((row) => String(row[0]).trim().toLowerCase() === 'area') ?? []
    const statuses = ['Booked', 'EOI', 'Blocked', 'Open'] as const
    const slices = statuses.map((status) => { const index = headers.findIndex((header) => String(header).trim().toLowerCase() === status.toLowerCase()); return { status, units: number(units[index]), area: number(area[index]) } })
    return Response.json({ slices }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { console.error('Inventory Summary request failed', error); return Response.json({ error: 'Unable to load Inventory Summary data.' }, { status: 502 }) }
}
export default { fetch: handleInventoryRequest }
