import { createMiddleware } from 'hono/factory'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { projectMembers } from '../db/schema.js'
import type { MemberRole } from '../db/schema.js'
import { forbidden, notFound } from '../lib/errors.js'
import { hasMinimumRole } from '../lib/permissions.js'
import type { AppEnv } from '../types/context.js'

/**
 * Ensures the authenticated user is a member of the project referenced by `:projectId`.
 * Sets `projectRole` on the context. Requires `authMiddleware` upstream.
 */
export function requireProjectMember(minimumRole: MemberRole = 'view') {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user')
    const projectId = c.req.param('projectId')
    if (!projectId) {
      throw notFound('Project')
    }

    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
      .limit(1)

    if (!membership) {
      throw notFound('Project')
    }

    if (!hasMinimumRole(membership.role, minimumRole)) {
      throw forbidden(`Requires ${minimumRole} role or higher`)
    }

    c.set('projectRole', membership.role)
    await next()
  })
}
