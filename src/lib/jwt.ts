import { SignJWT, jwtVerify } from 'jose'
import type { User } from '../db/schema.js'

const JWT_ISSUER = 'quartz-api'
const JWT_AUDIENCE = 'quartz-client'
const JWT_EXPIRY = '7d'

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

export type JwtPayload = {
  sub: string
  discordId: string
  username: string
}

/** Issue a signed JWT for an authenticated user. */
export async function signToken(user: User): Promise<string> {
  return new SignJWT({
    discordId: user.discordId,
    username: user.username,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret())
}

/** Verify and decode a JWT. Throws on invalid/expired tokens. */
export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  })

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Invalid token payload')
  }

  return {
    sub: payload.sub,
    discordId: String(payload.discordId ?? ''),
    username: String(payload.username ?? ''),
  }
}
