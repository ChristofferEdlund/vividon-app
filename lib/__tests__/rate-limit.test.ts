import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('rate-limit utility', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('should return null (allow) when Upstash is not configured', async () => {
    const { checkRateLimit, RATE_LIMITS } = await import('@/lib/rate-limit')
    const request = new NextRequest('http://localhost:3000/test')
    const result = await checkRateLimit(request, RATE_LIMITS.generate, 'user-1')
    expect(result).toBeNull()
  })

  it('should export pre-configured rate limits', async () => {
    const { RATE_LIMITS } = await import('@/lib/rate-limit')
    expect(RATE_LIMITS.generate).toBeDefined()
    expect(RATE_LIMITS.generate.maxRequests).toBe(10)
    expect(RATE_LIMITS.pluginSession).toBeDefined()
    expect(RATE_LIMITS.pluginSession.maxRequests).toBe(20)
    expect(RATE_LIMITS.inviteClaim).toBeDefined()
    expect(RATE_LIMITS.inviteClaim.maxRequests).toBe(5)
  })
})
