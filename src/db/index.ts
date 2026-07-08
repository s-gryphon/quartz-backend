import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

/** Env vars used by Neon / Vercel integrations (in priority order). */
const DATABASE_URL_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'NEON_DATABASE_URL',
] as const

function getDatabaseUrl(): string {
  for (const key of DATABASE_URL_KEYS) {
    const url = process.env[key]
    if (url) return url
  }

  throw new Error(
    `Database URL not set. Add one of: ${DATABASE_URL_KEYS.join(', ')}`,
  )
}

export type Database = NeonHttpDatabase<typeof schema>

let _db: Database | null = null

/** Lazy singleton — avoids throwing at import time during builds. */
export function getDb(): Database {
  if (!_db) {
    const sql = neon(getDatabaseUrl())
    _db = drizzle(sql, { schema })
  }
  return _db
}

/** Drizzle client for Neon Postgres (HTTP driver, Vercel-compatible). */
export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver)
  },
})
