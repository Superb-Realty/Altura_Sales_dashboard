import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Vercel automatically runs files in /api as serverless functions, but plain
// `vite` does not. This middleware keeps local development behavior identical
// by forwarding API requests to the same handlers.
function localApi(): Plugin {
  return {
    name: 'local-api-handlers',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/(auth|sales|inventory|floors|configuration|eoi-booked|visits|vertical-split)(?:\?.*)?$/)
        if (!match) return next()
        try {
          const module = await server.ssrLoadModule(`/api/${match[1]}.ts`)
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value)
            else if (Array.isArray(value)) headers.set(key, value.join(', '))
          }
          const request = new Request(`http://${req.headers.host || 'localhost'}${req.url}`, {
            method: req.method || 'GET',
            headers,
          })
          const response = await module.default.fetch(request)
          res.statusCode = response.status
          response.headers.forEach((value: string, key: string) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          server.config.logger.error(`Local API request failed: ${error}`)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Local API request failed.' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApi()],
})
