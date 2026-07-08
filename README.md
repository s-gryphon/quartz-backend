# Quartz Backend

REST API for **Quartz** — an automated Quartermaster system for Minecraft Civilization events. Stores chest inventories, project metadata, and access permissions for multi-nation events.

## Tech Stack

- [Hono](https://hono.dev/) (Vercel serverless + local Node)
- TypeScript
- [Drizzle ORM](https://orm.drizzle.team/) + Neon Postgres
- JWT authentication (Discord OAuth stub for now)

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm run db:push        # apply schema to Neon
npm run dev            # http://localhost:3000/api
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `FRONTEND_URL` | No | Extra CORS origin for production frontend |
| `PORT` | No | Local dev port (default 3000) |

## API Routes

Base path: `/api`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/auth/login` | — | Stub login (upsert user, return JWT) |
| GET | `/auth/me` | JWT | Current user |
| GET | `/projects` | JWT | List user's projects |
| POST | `/projects` | JWT | Create project |
| GET | `/projects/:id` | JWT + member | Get project |
| PATCH | `/projects/:id` | JWT + admin | Update project |
| DELETE | `/projects/:id` | JWT + admin | Delete project |
| GET | `/projects/:id/members` | JWT + view | List members |
| POST | `/projects/:id/members` | JWT + admin | Add member |
| PATCH | `/projects/:id/members/:userId` | JWT + admin | Update role |
| DELETE | `/projects/:id/members/:userId` | JWT + admin | Remove member |
| GET | `/projects/:id/chests` | JWT + view | List chests |
| POST | `/projects/:id/chests` | JWT + edit | Register chest |
| GET | `/projects/:id/chests/:chestId` | JWT + view | Get chest + contents |
| PATCH | `/projects/:id/chests/:chestId` | JWT + edit | Update metadata |
| DELETE | `/projects/:id/chests/:chestId` | JWT + edit | Delete chest |
| PUT | `/projects/:id/chests/:chestId/contents` | JWT + edit | Replace inventory |

### Roles

- **view** — read chests and project data
- **edit** — manage chests and inventory
- **admin** — full project control including members

## Deploy (Vercel)

1. Connect repo to Vercel (root directory = repo root, not a parent monorepo folder)
2. Set `DATABASE_URL` and `JWT_SECRET` in project env vars
3. **Do not** set a Build Command or Output Directory — `vercel.json` handles this
4. Push and deploy

This is an API-only project: there is no static `public` folder. Vercel runs the serverless function at `api/index.ts`.

Verify: `GET https://YOUR-PROJECT.vercel.app/api/health`

## Project Structure

```
src/
  app.ts              # Hono app factory + error handling
  index.ts            # Local dev server
  db/
    schema.ts         # Drizzle table definitions
    index.ts          # Neon connection
  lib/                # JWT, errors, permissions
  middleware/         # Auth, CORS, project access
  routes/             # auth, projects, chests
api/
  index.ts            # Vercel serverless entry
```
