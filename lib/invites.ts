import { randomBytes } from "crypto"
import { db } from "@/lib/db"
import { invites, userProfiles, creditTransactions } from "@/lib/db/schema"
import { eq, and, isNull, or, gt, desc } from "drizzle-orm"

// Generate a unique 8-character invite code
export function generateInviteCode(): string {
  return randomBytes(6).toString("base64url").slice(0, 8).toUpperCase()
}

// Create a new invite
export async function createInvite(
  email: string,
  creditsToGrant: number,
  createdByUserId: string,
  expiresInDays?: number
) {
  const code = generateInviteCode()
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null

  const [invite] = await db
    .insert(invites)
    .values({
      email: email.toLowerCase().trim(),
      code,
      creditsToGrant,
      expiresAt,
      createdByUserId,
    })
    .returning()

  return invite
}

// Validate an invite code (check if it exists, not used, not expired)
export async function validateInviteCode(code: string) {
  const results = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.code, code.toUpperCase()),
        eq(invites.used, false),
        or(isNull(invites.expiresAt), gt(invites.expiresAt, new Date()))
      )
    )
    .limit(1)

  return results[0] || null
}

// Accept an invite (creates/updates user profile, grants credits)
export async function acceptInvite(
  inviteCode: string,
  userId: string,
  userEmail: string
) {
  const invite = await validateInviteCode(inviteCode)

  if (!invite) {
    throw new Error("Invalid or expired invite code")
  }

  // Check if email matches (case insensitive)
  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error("This invite was sent to a different email address")
  }

  // Check if user profile exists
  const existingProfiles = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1)

  if (existingProfiles.length > 0) {
    // Update existing profile - approve and add credits
    await db
      .update(userProfiles)
      .set({
        isApproved: true,
        creditsRemaining:
          existingProfiles[0].creditsRemaining + invite.creditsToGrant,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId))
  } else {
    // Create new profile with approval and credits
    await db.insert(userProfiles).values({
      id: userId,
      email: userEmail,
      isApproved: true,
      creditsRemaining: invite.creditsToGrant,
    })
  }

  // Record credit transaction
  await db.insert(creditTransactions).values({
    userId,
    amount: invite.creditsToGrant,
    type: "grant",
    description: `Invite code: ${invite.code}`,
  })

  // Mark invite as used
  await db
    .update(invites)
    .set({
      used: true,
      usedAt: new Date(),
      usedByUserId: userId,
    })
    .where(eq(invites.id, invite.id))

  return {
    creditsGranted: invite.creditsToGrant,
  }
}

// List all invites (for admin panel)
export async function listInvites() {
  return db.select().from(invites).orderBy(desc(invites.createdAt))
}

// Revoke an invite (delete if not used)
export async function revokeInvite(inviteId: string) {
  const result = await db
    .delete(invites)
    .where(and(eq(invites.id, inviteId), eq(invites.used, false)))
    .returning()

  return result.length > 0
}

// Mark invite as sent (update sentAt timestamp)
export async function markInviteSent(inviteId: string) {
  await db
    .update(invites)
    .set({ sentAt: new Date() })
    .where(eq(invites.id, inviteId))
}

// Get invite by code (for public validation - returns limited info)
export async function getInvitePublicInfo(code: string) {
  const invite = await validateInviteCode(code)

  if (!invite) {
    return null
  }

  return {
    email: invite.email,
    creditsToGrant: invite.creditsToGrant,
    expiresAt: invite.expiresAt,
  }
}
