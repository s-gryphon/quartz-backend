import { cors } from 'hono/cors'

/** Allowed origins for the React frontend (GitHub Pages + local dev). */
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  // GitHub Pages — update to your actual org/repo URL when deployed
  'https://quartz.pages.dev',
]

/**
 * CORS middleware configured for the Quartz frontend.
 * Set FRONTEND_URL env var to add a custom production origin.
 */
export function corsMiddleware() {
  const extraOrigin = process.env.FRONTEND_URL

  return cors({
    origin: (origin) => {
      if (!origin) return '*'
      const allowed = extraOrigin ? [...ALLOWED_ORIGINS, extraOrigin] : ALLOWED_ORIGINS
      return allowed.includes(origin) ? origin : allowed[0]
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: true,
  })
}
