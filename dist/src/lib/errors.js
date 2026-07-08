export class ApiError extends Error {
    code;
    status;
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
        this.name = 'ApiError';
    }
}
/** Consistent JSON error envelope used across all routes. */
export function errorResponse(c, error) {
    return c.json({
        error: {
            code: error.code,
            message: error.message,
        },
    }, error.status);
}
export function notFound(resource) {
    return new ApiError('NOT_FOUND', `${resource} not found`, 404);
}
export function forbidden(message = 'Insufficient permissions') {
    return new ApiError('FORBIDDEN', message, 403);
}
export function unauthorized(message = 'Authentication required') {
    return new ApiError('UNAUTHORIZED', message, 401);
}
export function badRequest(message) {
    return new ApiError('BAD_REQUEST', message, 400);
}
export function conflict(message) {
    return new ApiError('CONFLICT', message, 409);
}
