import { defineConfig } from 'drizzle-kit'

function getDatabaseUrl(): string {
  for (const key of ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL'] as const) {
    if (process.env[key]) return process.env[key]!
  }
  throw new Error('Set DATABASE_URL or POSTGRES_URL for drizzle-kit')
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
})
