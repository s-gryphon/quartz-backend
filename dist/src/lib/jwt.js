import { SignJWT, jwtVerify } from 'jose';
const JWT_ISSUER = 'quartz-api';
const JWT_AUDIENCE = 'quartz-client';
const JWT_EXPIRY = '7d';
function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return new TextEncoder().encode(secret);
}
/** Issue a signed JWT for an authenticated user. */
export async function signToken(user) {
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
        .sign(getSecret());
}
/** Verify and decode a JWT. Throws on invalid/expired tokens. */
export async function verifyToken(token) {
    const { payload } = await jwtVerify(token, getSecret(), {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
    });
    if (!payload.sub || typeof payload.sub !== 'string') {
        throw new Error('Invalid token payload');
    }
    return {
        sub: payload.sub,
        discordId: String(payload.discordId ?? ''),
        username: String(payload.username ?? ''),
    };
}
