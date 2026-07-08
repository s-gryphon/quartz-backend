import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: ContentfulStatusCode = 400,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Consistent JSON error envelope used across all routes. */
export function errorResponse(c: Context, error: ApiError) {
  return c.json(
    {
      error: {
        code: error.code,
        message: error.message,
      },
    },
    error.status,
  )
}

export function notFound(resource: string): ApiError {
  return new ApiError('NOT_FOUND', `${resource} not found`, 404)
}

export function forbidden(message = 'Insufficient permissions'): ApiError {
  return new ApiError('FORBIDDEN', message, 403)
}

export function unauthorized(message = 'Authentication required'): ApiError {
  return new ApiError('UNAUTHORIZED', message, 401)
}

export function badRequest(message: string): ApiError {
  return new ApiError('BAD_REQUEST', message, 400)
}

export function conflict(message: string): ApiError {
  return new ApiError('CONFLICT', message, 409)
}
