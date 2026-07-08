import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';
function getDatabaseUrl() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error('DATABASE_URL environment variable is not set');
    }
    return url;
}
let _db = null;
/** Lazy singleton — avoids throwing at import time during builds. */
export function getDb() {
    if (!_db) {
        const sql = neon(getDatabaseUrl());
        _db = drizzle(sql, { schema });
    }
    return _db;
}
/** Drizzle client for Neon Postgres (HTTP driver, Vercel-compatible). */
export const db = new Proxy({}, {
    get(_target, prop, receiver) {
        return Reflect.get(getDb(), prop, receiver);
    },
});
