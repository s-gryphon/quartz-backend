import type { MemberRole } from '../db/schema.js'

const ROLE_RANK: Record<MemberRole, number> = {
  view: 1,
  edit: 2,
  admin: 3,
}

/** Returns true if `role` meets or exceeds the required minimum role. */
export function hasMinimumRole(role: MemberRole, minimum: MemberRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}
