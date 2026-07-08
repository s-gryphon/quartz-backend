import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { signToken } from '../lib/jwt.js'
import type { AppEnv } from '../types/context.js'

const authRoutes = new Hono<AppEnv>()

const loginSchema = z.object({
  discord_id: z.string().min(1).max(32),
  username: z.string().min(1).max(64),
  avatar: z.string().url().optional().nullable(),
})

/**
 * POST /auth/login
 * Stub login — upserts a user by Discord ID and returns a JWT.
 * Replace with real Discord OAuth once the frontend flow is wired up.
 */
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { discord_id, username, avatar } = c.req.valid('json')

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.discordId, discord_id))
    .limit(1)

  let user = existing

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({ username, avatar: avatar ?? null })
      .where(eq(users.id, existing.id))
      .returning()
    user = updated
  } else {
    const [created] = await db
      .insert(users)
      .values({ discordId: discord_id, username, avatar: avatar ?? null })
      .returning()
    user = created
  }

  const token = await signToken(user)

  return c.json({
    token,
    user: {
      id: user.id,
      discord_id: user.discordId,
      username: user.username,
      avatar: user.avatar,
    },
  })
})

/**
 * GET /auth/me
 * Returns the currently authenticated user.
 */
authRoutes.get('/me', authMiddleware, (c) => {
  const user = c.get('user')
  return c.json({
    id: user.id,
    discord_id: user.discordId,
    username: user.username,
    avatar: user.avatar,
  })
})

export { authRoutes }
