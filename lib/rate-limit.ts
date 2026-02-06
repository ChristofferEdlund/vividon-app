import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest, NextResponse } from "next/server"

const isUpstashConfigured =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (!isUpstashConfigured) return null
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redis
}

export type RateLimitConfig = {
  maxRequests: number
  window: `${number} ${"s" | "m" | "h" | "d"}`
  prefix: string
}

export const RATE_LIMITS = {
  generate: {
    maxRequests: 10,
    window: "1 m" as const,
    prefix: "ratelimit:generate",
  },
  pluginSession: {
    maxRequests: 20,
    window: "1 m" as const,
    prefix: "ratelimit:plugin-session",
  },
  inviteClaim: {
    maxRequests: 5,
    window: "1 m" as const,
    prefix: "ratelimit:invite-claim",
  },
} satisfies Record<string, RateLimitConfig>

function createRateLimiter(config: RateLimitConfig): Ratelimit | null {
  const redisClient = getRedis()
  if (!redisClient) return null

  return new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.maxRequests, config.window),
    prefix: config.prefix,
    analytics: true,
  })
}

function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`

  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() || "unknown"
  return `ip:${ip}`
}

/**
 * Check rate limit for a request. Returns null if allowed, or a 429 Response if blocked.
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<NextResponse | null> {
  const limiter = createRateLimiter(config)

  if (!limiter) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[rate-limit] Upstash not configured - skipping rate limit for ${config.prefix}`
      )
    }
    return null
  }

  try {
    const identifier = getIdentifier(request, userId)
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(reset),
          },
        }
      )
    }

    return null
  } catch (error) {
    console.error(`[rate-limit] Error checking rate limit: ${error}`)
    return null
  }
}
