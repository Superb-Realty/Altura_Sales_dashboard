import { OAuth2Client } from 'google-auth-library'
import { config } from 'dotenv'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Vercel supplies environment variables in deployment. Loading this file also
// makes the same configuration available when the functions run locally.
config({ path: '.env.local', quiet: true })

const unauthorized = (message = 'Authentication is required.') => Response.json({ error: message }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
const configuredEmails = () => new Set((process.env.ALLOWED_GOOGLE_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean))
export type AuthenticatedUser = { email: string; name: string }
const sessionSecret = () => {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  try { return JSON.parse(process.env.GOOGLE_SHEETS_CONFIG || '{}').private_key as string | undefined } catch { return process.env.GOOGLE_PRIVATE_KEY }
}
export function createSessionToken(user: AuthenticatedUser) {
  const secret = sessionSecret()
  if (!secret) throw new Error('Session signing is not configured.')
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `amber.${payload}.${signature}`
}
const verifySessionToken = (token: string): AuthenticatedUser | null => {
  const [, payload, signature] = token.split('.')
  const secret = sessionSecret()
  if (!payload || !signature || !secret) return null
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  const left = Buffer.from(signature); const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  try { const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AuthenticatedUser & { exp: number }; return session.exp > Date.now() ? { email: session.email, name: session.name } : null } catch { return null }
}

export async function authenticate(request: Request): Promise<AuthenticatedUser | Response> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const allowedEmails = configuredEmails()
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!allowedEmails.size) return unauthorized('Authentication is not configured.')
  if (!token) return unauthorized()
  if (token.startsWith('amber.')) {
    const sessionUser = verifySessionToken(token)
    if (!sessionUser || !allowedEmails.has(sessionUser.email)) return unauthorized('Your dashboard session has expired. Please sign in again.')
    return sessionUser
  }
  if (!clientId) return unauthorized('Authentication is not configured.')
  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: token, audience: clientId })
    const payload = ticket.getPayload()
    const email = payload?.email?.toLowerCase()
    if (!email || !payload.email_verified || !allowedEmails.has(email)) return unauthorized('This Google account is not authorized to access the dashboard.')
    return { email, name: payload.name || email }
  } catch { return unauthorized('Your Google sign-in has expired or could not be verified.') }
}
