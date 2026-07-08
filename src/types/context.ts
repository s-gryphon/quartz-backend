import type { JwtPayload } from '../lib/jwt.js'
import type { MemberRole, User } from '../db/schema.js'

/** Variables attached to the Hono context by middleware. */
export type AppVariables = {
  jwt: JwtPayload
  user: User
  projectRole?: MemberRole
}

export type AppEnv = {
  Variables: AppVariables
}
