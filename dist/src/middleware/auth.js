import { createMiddleware } from 'hono/factory';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { unauthorized } from '../lib/errors.js';
import { verifyToken } from '../lib/jwt.js';
/**
 * JWT authentication middleware.
 * Expects `Authorization: Bearer <token>` header.
 * Sets `jwt` and `user` on the context for downstream handlers.
 */
export const authMiddleware = createMiddleware(async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
        throw unauthorized('Missing or invalid Authorization header');
    }
    const token = header.slice(7);
    let payload;
    try {
        payload = await verifyToken(token);
    }
    catch {
        throw unauthorized('Invalid or expired token');
    }
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user) {
        throw unauthorized('User not found');
    }
    c.set('jwt', payload);
    c.set('user', user);
    await next();
});
/** Optional auth — attaches user if token present, otherwise continues anonymously. */
export const optionalAuthMiddleware = createMiddleware(async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
        await next();
        return;
    }
    try {
        const payload = await verifyToken(header.slice(7));
        const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
        if (user) {
            c.set('jwt', payload);
            c.set('user', user);
        }
    }
    catch {
        // Ignore invalid tokens for optional auth
    }
    await next();
});
