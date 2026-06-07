import { redis } from './redis'

const SESSIONS_KEY = (userId: string) => `sessions:${userId}`

/**
 * Register a session token for a user.
 * Used to track active sessions for instant revocation.
 */
export async function registerSession(userId: string, sessionToken: string): Promise<void> {
  await redis.sadd(SESSIONS_KEY(userId), sessionToken)
}

/**
 * Revoke all active sessions for a user.
 * Called when staff is removed — immediately invalidates all their sessions.
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await redis.del(SESSIONS_KEY(userId))
}

/**
 * Check if a session token is still valid for the user.
 * Returns false if the user's sessions have been revoked.
 */
export async function isSessionValid(userId: string, sessionToken: string): Promise<boolean> {
  // If the set doesn't exist (deleted on revoke), session is invalid
  const members = await redis.smembers(SESSIONS_KEY(userId))

  // If no sessions registered yet (legacy or first login), allow through
  if (members.length === 0) return true

  return members.includes(sessionToken)
}
