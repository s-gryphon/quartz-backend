import { Hono } from 'hono'
import { corsMiddleware } from './middleware/cors.js'
import { authRoutes } from './routes/auth.js'
import { projectRoutes } from './routes/projects.js'
import { chestRoutes } from './routes/chests.js'
import { ApiError, errorResponse } from './lib/errors.js'
import type { AppEnv } from './types/context.js'

/**
 * Quartz API — automated Quartermaster system for Minecraft Civilization events.
 *
 * Route map:
 *   GET  /health
 *   POST /auth/login          — stub login (Discord OAuth TBD)
 *   GET  /auth/me             — current user
 *   *    /projects/*          — project CRUD + members
 *   *    /projects/:id/chests/* — chest tracking + inventory
 */
export function createApp() {
  const app = new Hono<AppEnv>().basePath('/api')

  app.use('*', corsMiddleware())

  /** Global error handler — converts ApiError and unknown errors to JSON. */
  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return errorResponse(c, err)
    }
    console.error('Unhandled error:', err)
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      500,
    )
  })

  app.get('/health', (c) =>
    c.json({ status: 'ok', service: 'quartz-api', timestamp: new Date().toISOString() }),
  )

  app.route('/auth', authRoutes)
  app.route('/projects', projectRoutes)
  app.route('/projects', chestRoutes)

  return app
}

export type QuartzApp = ReturnType<typeof createApp>
