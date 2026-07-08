import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { projectMembers, projects, users } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireProjectMember } from '../middleware/project-access.js';
import { conflict, notFound } from '../lib/errors.js';
const projectRoutes = new Hono();
projectRoutes.use('*', authMiddleware);
const createProjectSchema = z.object({
    name: z.string().min(1).max(128),
    description: z.string().max(2000).optional().nullable(),
});
const updateProjectSchema = z.object({
    name: z.string().min(1).max(128).optional(),
    description: z.string().max(2000).optional().nullable(),
});
const memberRoleSchema = z.enum(['view', 'edit', 'admin']);
const addMemberSchema = z.object({
    user_id: z.string().uuid(),
    role: memberRoleSchema.default('view'),
});
const updateMemberSchema = z.object({
    role: memberRoleSchema,
});
function serializeProject(project, role) {
    return {
        id: project.id,
        name: project.name,
        description: project.description,
        created_at: project.createdAt.toISOString(),
        updated_at: project.updatedAt.toISOString(),
        ...(role !== undefined ? { role } : {}),
    };
}
/**
 * GET /projects
 * List all projects the authenticated user belongs to.
 */
projectRoutes.get('/', async (c) => {
    const user = c.get('user');
    const rows = await db
        .select({ project: projects, role: projectMembers.role })
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .where(eq(projectMembers.userId, user.id));
    return c.json({
        projects: rows.map(({ project, role }) => serializeProject(project, role)),
    });
});
/**
 * POST /projects
 * Create a new project. The creator is automatically assigned the admin role.
 */
projectRoutes.post('/', zValidator('json', createProjectSchema), async (c) => {
    const user = c.get('user');
    const body = c.req.valid('json');
    const [project] = await db
        .insert(projects)
        .values({ name: body.name, description: body.description ?? null })
        .returning();
    await db.insert(projectMembers).values({
        userId: user.id,
        projectId: project.id,
        role: 'admin',
    });
    return c.json({ project: serializeProject(project, 'admin') }, 201);
});
/**
 * GET /projects/:projectId
 * Get project details (requires membership).
 */
projectRoutes.get('/:projectId', requireProjectMember('view'), async (c) => {
    const projectId = c.req.param('projectId');
    const role = c.get('projectRole');
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project)
        throw notFound('Project');
    return c.json({ project: serializeProject(project, role) });
});
/**
 * PATCH /projects/:projectId
 * Update project metadata (admin only).
 */
projectRoutes.patch('/:projectId', requireProjectMember('admin'), zValidator('json', updateProjectSchema), async (c) => {
    const projectId = c.req.param('projectId');
    const body = c.req.valid('json');
    if (body.name === undefined && body.description === undefined) {
        return c.json({ error: { code: 'BAD_REQUEST', message: 'No fields to update' } }, 400);
    }
    const [project] = await db
        .update(projects)
        .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        updatedAt: new Date(),
    })
        .where(eq(projects.id, projectId))
        .returning();
    if (!project)
        throw notFound('Project');
    return c.json({ project: serializeProject(project, 'admin') });
});
/**
 * DELETE /projects/:projectId
 * Delete a project and all related data (admin only).
 */
projectRoutes.delete('/:projectId', requireProjectMember('admin'), async (c) => {
    const projectId = c.req.param('projectId');
    const [deleted] = await db.delete(projects).where(eq(projects.id, projectId)).returning();
    if (!deleted)
        throw notFound('Project');
    return c.body(null, 204);
});
/**
 * GET /projects/:projectId/members
 * List project members (view+).
 */
projectRoutes.get('/:projectId/members', requireProjectMember('view'), async (c) => {
    const projectId = c.req.param('projectId');
    const rows = await db
        .select({
        userId: projectMembers.userId,
        role: projectMembers.role,
        username: users.username,
        discordId: users.discordId,
        avatar: users.avatar,
    })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(projectMembers.projectId, projectId));
    return c.json({
        members: rows.map((row) => ({
            user_id: row.userId,
            role: row.role,
            username: row.username,
            discord_id: row.discordId,
            avatar: row.avatar,
        })),
    });
});
/**
 * POST /projects/:projectId/members
 * Add a member to the project (admin only).
 */
projectRoutes.post('/:projectId/members', requireProjectMember('admin'), zValidator('json', addMemberSchema), async (c) => {
    const projectId = c.req.param('projectId');
    const body = c.req.valid('json');
    const [targetUser] = await db.select().from(users).where(eq(users.id, body.user_id)).limit(1);
    if (!targetUser)
        throw notFound('User');
    const [existing] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, body.user_id)))
        .limit(1);
    if (existing) {
        throw conflict('User is already a member of this project');
    }
    const [member] = await db
        .insert(projectMembers)
        .values({ projectId, userId: body.user_id, role: body.role })
        .returning();
    return c.json({
        member: {
            user_id: member.userId,
            role: member.role,
            username: targetUser.username,
            discord_id: targetUser.discordId,
            avatar: targetUser.avatar,
        },
    }, 201);
});
/**
 * PATCH /projects/:projectId/members/:userId
 * Update a member's role (admin only).
 */
projectRoutes.patch('/:projectId/members/:userId', requireProjectMember('admin'), zValidator('json', updateMemberSchema), async (c) => {
    const projectId = c.req.param('projectId');
    const userId = c.req.param('userId');
    const body = c.req.valid('json');
    const currentUser = c.get('user');
    if (userId === currentUser.id && body.role !== 'admin') {
        return c.json({ error: { code: 'BAD_REQUEST', message: 'Cannot demote yourself' } }, 400);
    }
    const [member] = await db
        .update(projectMembers)
        .set({ role: body.role })
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
        .returning();
    if (!member)
        throw notFound('Member');
    return c.json({ member: { user_id: member.userId, role: member.role } });
});
/**
 * DELETE /projects/:projectId/members/:userId
 * Remove a member from the project (admin only).
 */
projectRoutes.delete('/:projectId/members/:userId', requireProjectMember('admin'), async (c) => {
    const projectId = c.req.param('projectId');
    const userId = c.req.param('userId');
    const currentUser = c.get('user');
    if (userId === currentUser.id) {
        return c.json({ error: { code: 'BAD_REQUEST', message: 'Cannot remove yourself from the project' } }, 400);
    }
    const [removed] = await db
        .delete(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
        .returning();
    if (!removed)
        throw notFound('Member');
    return c.body(null, 204);
});
export { projectRoutes };
