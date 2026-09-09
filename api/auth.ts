import { authenticate } from './auth-utils'

async function handleAuthRequest(request: Request) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } })
  const user = await authenticate(request)
  if (user instanceof Response) return user
  return Response.json({ user }, { headers: { 'Cache-Control': 'no-store' } })
}
export default { fetch: handleAuthRequest }
