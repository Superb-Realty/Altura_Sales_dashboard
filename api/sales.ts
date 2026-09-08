import { google } from 'googleapis'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

type SalesRow = { month: string; meetings: number; visits: number; units: number; area: number }
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
const number = (value: unknown) => Number(String(value ?? '').replace(/,/g, '')) || 0
const chronologicalValue = (month: string) => {
  const timestamp = Date.parse(month)
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
}

async function handleSalesRequest(request: Request) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } })
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const sheetId = process.env.GOOGLE_SHEET_ID
  const range = process.env.GOOGLE_SHEET_RANGE || 'Sales!A:E'
  if (!email || !privateKey || !sheetId) return Response.json({ error: 'Server data source is not configured.' }, { status: 503 })
  try {
    const auth = new google.auth.JWT({ email, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
    const sheets = google.sheets({ version: 'v4', auth })
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
    const [header = [], ...records] = response.data.values ?? []
    const columns = header.map((item) => normalize(String(item)))
    const read = (record: unknown[], aliases: string[]) => record[columns.findIndex((column) => aliases.includes(column))]
    const rows: SalesRow[] = records.map((record) => ({ month: String(read(record, ['month', 'period']) ?? ''), meetings: number(read(record, ['cpmeetings', 'meetings'])), visits: number(read(record, ['totalvisits', 'visits'])), units: number(read(record, ['eoiunits', 'units'])), area: number(read(record, ['eoiarea', 'area'])) })).filter((row) => row.month)
    rows.sort((left, right) => chronologicalValue(left.month) - chronologicalValue(right.month))
    return Response.json({ rows }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } })
  } catch (error) { console.error('Google Sheets request failed', error); return Response.json({ error: 'Unable to load sales data.' }, { status: 502 }) }
}

export default { fetch: handleSalesRequest }
