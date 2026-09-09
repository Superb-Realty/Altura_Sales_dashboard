import { google } from 'googleapis'

const unauthorized = (message = 'Authentication is required.') => Response.json({ error: message }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
const configuredEmails = () => new Set((process.env.ALLOWED_GOOGLE_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean))
export type AuthenticatedUser = { email: string; name: string }

export async function authenticate(request: Request): Promise<AuthenticatedUser | Response> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const allowedEmails = configuredEmails()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!clientId || !allowedEmails.size) return unauthorized('Authentication is not configured.')
  if (!token) return unauthorized()
  try {
    const ticket = await new google.auth.OAuth2(clientId).verifyIdToken({ idToken: token, audience: clientId })
    const payload = ticket.getPayload()
    const email = payload?.email?.toLowerCase()
    if (!email || !payload.email_verified || !allowedEmails.has(email)) return unauthorized('This Google account is not authorized to access the dashboard.')
    return { email, name: payload.name || email }
  } catch { return unauthorized('Your Google sign-in has expired or could not be verified.') }
}
