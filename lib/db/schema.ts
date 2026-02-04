import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core"

// Enums
export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "pro",
  "enterprise",
])

export const generationStatusEnum = pgEnum("generation_status", [
  "pending",
  "processing",
  "completed",
  "failed",
])

export const transactionTypeEnum = pgEnum("transaction_type", [
  "purchase",
  "grant",
  "subscription_refresh",
  "usage",
  "refund",
])

// Existing waitlist table (from your current schema)
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// User profiles - extends Supabase auth.users
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(), // References auth.users(id)
  email: text("email").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionTier: subscriptionTierEnum("subscription_tier")
    .default("free")
    .notNull(),
  creditsRemaining: integer("credits_remaining").default(0).notNull(),
  creditsUsedTotal: integer("credits_used_total").default(0).notNull(),
  isApproved: boolean("is_approved").default(false).notNull(), // Must be approved to generate
  isBlocked: boolean("is_blocked").default(false).notNull(),   // Emergency block
  isAdmin: boolean("is_admin").default(false).notNull(),       // Can access /admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Generation history
export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => userProfiles.id)
    .notNull(),
  modelUsed: text("model_used").notNull(), // e.g., "gemini-2.5-flash-image"
  qualityTier: text("quality_tier").notNull(), // "cheap", "balanced", "quality"
  creditsCost: integer("credits_cost").notNull(),
  status: generationStatusEnum("status").default("pending").notNull(),
  inputFileUri: text("input_file_uri"),
  outputFileUri: text("output_file_uri"),
  prompt: text("prompt"),
  metadata: jsonb("metadata"), // aspect ratio, dimensions, etc.
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
})

// Credit transactions
export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => userProfiles.id)
    .notNull(),
  amount: integer("amount").notNull(), // positive for additions, negative for usage
  type: transactionTypeEnum("type").notNull(),
  stripePaymentId: text("stripe_payment_id"),
  stripeInvoiceId: text("stripe_invoice_id"),
  generationId: uuid("generation_id").references(() => generations.id),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Prompt library (centrally managed presets)
export const promptLibrary = pgTable("prompt_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  category: text("category").notNull(),
  previewImageUrl: text("preview_image_url"),
  isPublic: boolean("is_public").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// API keys for plugin authentication
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => userProfiles.id)
    .notNull(),
  keyHash: text("key_hash").notNull(), // Hashed API key
  keyPrefix: text("key_prefix").notNull(), // First 8 chars for identification
  name: text("name").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Plugin auth session status enum
export const pluginAuthSessionStatusEnum = pgEnum("plugin_auth_session_status", [
  "pending",
  "completed",
  "expired",
])

// Plugin auth sessions for browser-based login flow
export const pluginAuthSessions = pgTable("plugin_auth_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id").references(() => userProfiles.id),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id),
  apiKeyPlaintext: text("api_key_plaintext"), // Temporary, cleared after retrieval
  status: pluginAuthSessionStatusEnum("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Invites for waitlist users
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  code: text("code").notNull().unique(),
  creditsToGrant: integer("credits_to_grant").default(10).notNull(),
  used: boolean("used").default(false).notNull(),
  usedAt: timestamp("used_at"),
  usedByUserId: uuid("used_by_user_id").references(() => userProfiles.id),
  expiresAt: timestamp("expires_at"),
  sentAt: timestamp("sent_at"),
  createdByUserId: uuid("created_by_user_id")
    .references(() => userProfiles.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Types for TypeScript
export type WaitlistEntry = typeof waitlist.$inferSelect
export type UserProfile = typeof userProfiles.$inferSelect
export type Generation = typeof generations.$inferSelect
export type CreditTransaction = typeof creditTransactions.$inferSelect
export type PromptLibraryEntry = typeof promptLibrary.$inferSelect
export type ApiKey = typeof apiKeys.$inferSelect
export type PluginAuthSession = typeof pluginAuthSessions.$inferSelect
export type Invite = typeof invites.$inferSelect
