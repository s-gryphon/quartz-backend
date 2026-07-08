const ROLE_RANK = {
    view: 1,
    edit: 2,
    admin: 3,
};
/** Returns true if `role` meets or exceeds the required minimum role. */
export function hasMinimumRole(role, minimum) {
    return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
