import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { chestContents, chests } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { requireProjectMember } from '../middleware/project-access.js'
import { conflict, notFound } from '../lib/errors.js'
import type { AppEnv } from '../types/context.js'

const chestRoutes = new Hono<AppEnv>()

chestRoutes.use('*', authMiddleware)

const chestContentSchema = z.object({
  slot: z.number().int().min(0).max(53),
  item_id: z.string().min(1).max(128),
  count: z.number().int().min(1).max(64).default(1),
  nbt: z.record(z.string(), z.unknown()).optional().nullable(),
})

const createChestSchema = z.object({
  world: z.string().min(1).max(128),
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
  name: z.string().max(128).optional().nullable(),
  color: z.string().max(32).optional().nullable(),
  tags: z.array(z.string().max(64)).max(20).optional(),
  notes: z.string().max(2000).optional().nullable(),
  contents: z.array(chestContentSchema).optional(),
})

const updateChestSchema = z.object({
  name: z.string().max(128).optional().nullable(),
  color: z.string().max(32).optional().nullable(),
  tags: z.array(z.string().max(64)).max(20).optional(),
  notes: z.string().max(2000).optional().nullable(),
})

const replaceContentsSchema = z.object({
  contents: z.array(chestContentSchema),
})

function serializeChest(chest: typeof chests.$inferSelect) {
  return {
    id: chest.id,
    project_id: chest.projectId,
    world: chest.world,
    x: chest.x,
    y: chest.y,
    z: chest.z,
    name: chest.name,
    color: chest.color,
    tags: chest.tags,
    notes: chest.notes,
    created_at: chest.createdAt.toISOString(),
    updated_at: chest.updatedAt.toISOString(),
  }
}

function serializeContent(row: typeof chestContents.$inferSelect) {
  return {
    slot: row.slot,
    item_id: row.itemId,
    count: row.count,
    nbt: row.nbt ?? null,
  }
}

async function getChestInProject(projectId: string, chestId: string) {
  const [chest] = await db
    .select()
    .from(chests)
    .where(and(eq(chests.id, chestId), eq(chests.projectId, projectId)))
    .limit(1)
  return chest ?? null
}

/**
 * GET /projects/:projectId/chests
 * List all chests in a project (view+).
 */
chestRoutes.get('/:projectId/chests', requireProjectMember('view'), async (c) => {
  const projectId = c.req.param('projectId')

  const rows = await db.select().from(chests).where(eq(chests.projectId, projectId))

  return c.json({ chests: rows.map(serializeChest) })
})

/**
 * POST /projects/:projectId/chests
 * Register a new chest at a world position (edit+).
 */
chestRoutes.post(
  '/:projectId/chests',
  requireProjectMember('edit'),
  zValidator('json', createChestSchema),
  async (c) => {
    const projectId = c.req.param('projectId')
    const body = c.req.valid('json')

    try {
      const [chest] = await db
        .insert(chests)
        .values({
          projectId,
          world: body.world,
          x: body.x,
          y: body.y,
          z: body.z,
          name: body.name ?? null,
          color: body.color ?? null,
          tags: body.tags ?? [],
          notes: body.notes ?? null,
        })
        .returning()

      if (body.contents?.length) {
        await db.insert(chestContents).values(
          body.contents.map((item) => ({
            chestId: chest.id,
            slot: item.slot,
            itemId: item.item_id,
            count: item.count,
            nbt: item.nbt ?? null,
          })),
        )
      }

      const contents = body.contents?.length
        ? await db.select().from(chestContents).where(eq(chestContents.chestId, chest.id))
        : []

      return c.json(
        {
          chest: serializeChest(chest),
          contents: contents.map(serializeContent),
        },
        201,
      )
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('unique')) {
        throw conflict('A chest already exists at this position')
      }
      throw err
    }
  },
)

/**
 * GET /projects/:projectId/chests/:chestId
 * Get a chest with its full inventory (view+).
 */
chestRoutes.get(
  '/:projectId/chests/:chestId',
  requireProjectMember('view'),
  async (c) => {
    const projectId = c.req.param('projectId')
    const chestId = c.req.param('chestId')

    const chest = await getChestInProject(projectId, chestId)
    if (!chest) throw notFound('Chest')

    const contents = await db
      .select()
      .from(chestContents)
      .where(eq(chestContents.chestId, chestId))

    return c.json({
      chest: serializeChest(chest),
      contents: contents.map(serializeContent),
    })
  },
)

/**
 * PATCH /projects/:projectId/chests/:chestId
 * Update chest metadata (edit+).
 */
chestRoutes.patch(
  '/:projectId/chests/:chestId',
  requireProjectMember('edit'),
  zValidator('json', updateChestSchema),
  async (c) => {
    const projectId = c.req.param('projectId')
    const chestId = c.req.param('chestId')
    const body = c.req.valid('json')

    const existing = await getChestInProject(projectId, chestId)
    if (!existing) throw notFound('Chest')

    const [chest] = await db
      .update(chests)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(chests.id, chestId))
      .returning()

    return c.json({ chest: serializeChest(chest!) })
  },
)

/**
 * DELETE /projects/:projectId/chests/:chestId
 * Remove a chest and its contents (edit+).
 */
chestRoutes.delete(
  '/:projectId/chests/:chestId',
  requireProjectMember('edit'),
  async (c) => {
    const projectId = c.req.param('projectId')
    const chestId = c.req.param('chestId')

    const existing = await getChestInProject(projectId, chestId)
    if (!existing) throw notFound('Chest')

    await db.delete(chests).where(eq(chests.id, chestId))

    return c.body(null, 204)
  },
)

/**
 * PUT /projects/:projectId/chests/:chestId/contents
 * Replace the full inventory snapshot for a chest (edit+).
 * Used by the Minecraft mod to sync chest state.
 */
chestRoutes.put(
  '/:projectId/chests/:chestId/contents',
  requireProjectMember('edit'),
  zValidator('json', replaceContentsSchema),
  async (c) => {
    const projectId = c.req.param('projectId')
    const chestId = c.req.param('chestId')
    const { contents } = c.req.valid('json')

    const existing = await getChestInProject(projectId, chestId)
    if (!existing) throw notFound('Chest')

    await db.delete(chestContents).where(eq(chestContents.chestId, chestId))

    if (contents.length > 0) {
      await db.insert(chestContents).values(
        contents.map((item) => ({
          chestId,
          slot: item.slot,
          itemId: item.item_id,
          count: item.count,
          nbt: item.nbt ?? null,
        })),
      )
    }

    await db.update(chests).set({ updatedAt: new Date() }).where(eq(chests.id, chestId))

    return c.json({ contents: contents.map((item) => ({
      slot: item.slot,
      item_id: item.item_id,
      count: item.count,
      nbt: item.nbt ?? null,
    })) })
  },
)

export { chestRoutes }
