import { randomBytes, createHash } from "crypto"
import { db } from "@/lib/db"
import { apiKeys, userProfiles } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

// Generate a secure API key
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  // Generate 32 random bytes (256 bits)
  const keyBytes = randomBytes(32)
  const key = `viv_${keyBytes.toString("base64url")}`
  const prefix = key.slice(0, 12) // "viv_" + first 8 chars
  const hash = hashApiKey(key)

  return { key, prefix, hash }
}

// Hash API key for storage
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

// Validate API key and return user
export async function validateApiKey(key: string) {
  if (!key || !key.startsWith("viv_")) {
    return null
  }

  const hash = hashApiKey(key)
  const prefix = key.slice(0, 12)

  // Find API key by hash
  const results = await db
    .select({
      apiKey: apiKeys,
      user: userProfiles,
    })
    .from(apiKeys)
    .innerJoin(userProfiles, eq(apiKeys.userId, userProfiles.id))
    .where(
      and(
        eq(apiKeys.keyHash, hash),
        eq(apiKeys.keyPrefix, prefix),
        eq(apiKeys.isActive, true)
      )
    )
    .limit(1)

  if (results.length === 0) {
    return null
  }

  const { apiKey, user } = results[0]

  // Check expiration
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return null
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))

  return { apiKey, user }
}

// Create a new API key for a user
export async function createApiKey(userId: string, name: string, expiresAt?: Date) {
  const { key, prefix, hash } = generateApiKey()

  const [newKey] = await db
    .insert(apiKeys)
    .values({
      userId,
      keyHash: hash,
      keyPrefix: prefix,
      name,
      expiresAt,
    })
    .returning()

  // Return the full key only once - it can never be retrieved again
  return {
    id: newKey.id,
    key, // Only returned at creation time!
    prefix,
    name,
    createdAt: newKey.createdAt,
    expiresAt: newKey.expiresAt,
  }
}

// Revoke an API key
export async function revokeApiKey(userId: string, keyId: string) {
  const result = await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning()

  return result.length > 0
}

// List API keys for a user (without hashes)
export async function listApiKeys(userId: string) {
  return db
    .select({
      id: apiKeys.id,
      prefix: apiKeys.keyPrefix,
      name: apiKeys.name,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      isActive: apiKeys.isActive,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(apiKeys.createdAt)
}
