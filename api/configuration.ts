import { google } from 'googleapis'
import { config } from 'dotenv'
import { authenticate } from './auth-utils.js'

config({ path: '.env.local', quiet: true })

async function handleConfigurationRequest(request: Request) {
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
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Configuration_Statement!A1:I100' })
    return Response.json({ rows: response.data.values ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { console.error('Configuration Statement request failed', error); return Response.json({ error: 'Unable to load Configuration Statement data.' }, { status: 502 }) }
}
export default { fetch: handleConfigurationRequest }
