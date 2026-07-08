import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return url
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
