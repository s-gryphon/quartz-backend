import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

/** Project membership roles — view (read-only), edit (manage chests), admin (full control). */
export const memberRoleEnum = pgEnum('member_role', ['view', 'edit', 'admin'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  discordId: text('discord_id').notNull().unique(),
  username: text('username').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const projectMembers = pgTable(
  'project_members',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull().default('view'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.projectId] })],
)

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull(),
  /** Permission strings, e.g. ["chests:read", "chests:write"] */
  permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const chests = pgTable(
  'chests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    world: text('world').notNull(),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    z: integer('z').notNull(),
    name: text('name'),
    color: text('color'),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('chests_project_position_idx').on(
      table.projectId,
      table.world,
      table.x,
      table.y,
      table.z,
    ),
  ],
)

export const chestContents = pgTable(
  'chest_contents',
  {
    chestId: uuid('chest_id')
      .notNull()
      .references(() => chests.id, { onDelete: 'cascade' }),
    slot: integer('slot').notNull(),
    itemId: text('item_id').notNull(),
    count: integer('count').notNull().default(1),
    nbt: jsonb('nbt').$type<Record<string, unknown>>(),
  },
  (table) => [primaryKey({ columns: [table.chestId, table.slot] })],
)

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  chestId: uuid('chest_id')
    .notNull()
    .references(() => chests.id, { onDelete: 'cascade' }),
  /** User ID, API key ID, or descriptive label for the actor. */
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  delta: jsonb('delta').$type<Record<string, unknown>>(),
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
})

// --- Relations (for typed queries with `with`) ---

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(projectMembers),
}))

export const projectsRelations = relations(projects, ({ many }) => ({
  members: many(projectMembers),
  chests: many(chests),
  apiKeys: many(apiKeys),
  transactions: many(transactions),
}))

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
}))

export const chestsRelations = relations(chests, ({ one, many }) => ({
  project: one(projects, { fields: [chests.projectId], references: [projects.id] }),
  contents: many(chestContents),
  transactions: many(transactions),
}))

export const chestContentsRelations = relations(chestContents, ({ one }) => ({
  chest: one(chests, { fields: [chestContents.chestId], references: [chests.id] }),
}))

// --- Inferred types ---

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type ProjectMember = typeof projectMembers.$inferSelect
export type MemberRole = (typeof memberRoleEnum.enumValues)[number]
export type Chest = typeof chests.$inferSelect
export type NewChest = typeof chests.$inferInsert
export type ChestContent = typeof chestContents.$inferSelect
export type Transaction = typeof transactions.$inferSelect
