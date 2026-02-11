import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock all external dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'gen-1' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}))

vi.mock('@/lib/db/schema', () => ({
  userProfiles: { id: 'id', isApproved: 'isApproved', isBlocked: 'isBlocked', creditsRemaining: 'creditsRemaining', creditsUsedTotal: 'creditsUsedTotal' },
  generations: { id: 'id' },
  creditTransactions: {},
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
}))

vi.mock('@/lib/api-keys', () => ({
  validateApiKey: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
  RATE_LIMITS: {
    generate: { maxRequests: 10, window: '1 m', prefix: 'test' },
  },
}))

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn().mockResolvedValue({
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  data: 'base64imagedata',
                  mimeType: 'image/png',
                },
              }],
            },
          }],
        }),
      },
    })),
  }
})

import { POST } from '../route'
import { createClient } from '@/lib/supabase/server'
import { validateApiKey } from '@/lib/api-keys'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

function createRequest(body: any, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

function mockAuthenticatedUser(profile: any) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      }),
    },
  } as any)

  // Mock the chained db.select().from().where() for profile lookup
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(profile ? [profile] : []),
    }),
  } as any)
}

describe('POST /api/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-key'
    delete process.env.GENERATION_ENABLED
  })

  it('should return 401 when no auth header is provided', async () => {
    const request = createRequest({ prompt: 'test', inputBase64: 'abc' })
    const response = await POST(request)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toContain('Bearer token required')
  })

  it('should return 401 for invalid API key', async () => {
    vi.mocked(validateApiKey).mockResolvedValue(null)

    const request = createRequest(
      { prompt: 'test', inputBase64: 'abc' },
      { Authorization: 'Bearer viv_invalid_key_here' }
    )
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should return 400 when prompt is missing', async () => {
    mockAuthenticatedUser({
      id: 'user-1',
      isApproved: true,
      isBlocked: false,
      creditsRemaining: 100,
      creditsUsedTotal: 0,
    })

    const request = createRequest(
      { inputBase64: 'abc' },
      { Authorization: 'Bearer session-token' }
    )
    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('prompt')
  })

  it('should return 400 when input image is missing', async () => {
    mockAuthenticatedUser({
      id: 'user-1',
      isApproved: true,
      isBlocked: false,
      creditsRemaining: 100,
      creditsUsedTotal: 0,
    })

    const request = createRequest(
      { prompt: 'test' },
      { Authorization: 'Bearer session-token' }
    )
    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('inputFileUri or inputBase64')
  })

  it('should return 402 when user has insufficient credits', async () => {
    mockAuthenticatedUser({
      id: 'user-1',
      isApproved: true,
      isBlocked: false,
      creditsRemaining: 0,
      creditsUsedTotal: 50,
    })

    const request = createRequest(
      { prompt: 'test', inputBase64: 'abc', qualityTier: 'balanced' },
      { Authorization: 'Bearer session-token' }
    )
    const response = await POST(request)
    expect(response.status).toBe(402)
    const data = await response.json()
    expect(data.error).toContain('Insufficient credits')
  })

  it('should return 403 when user is not approved', async () => {
    mockAuthenticatedUser({
      id: 'user-1',
      isApproved: false,
      isBlocked: false,
      creditsRemaining: 100,
      creditsUsedTotal: 0,
    })

    const request = createRequest(
      { prompt: 'test', inputBase64: 'abc' },
      { Authorization: 'Bearer session-token' }
    )
    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('should return 403 when user is blocked', async () => {
    mockAuthenticatedUser({
      id: 'user-1',
      isApproved: true,
      isBlocked: true,
      creditsRemaining: 100,
      creditsUsedTotal: 0,
    })

    const request = createRequest(
      { prompt: 'test', inputBase64: 'abc' },
      { Authorization: 'Bearer session-token' }
    )
    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('should return 503 when generation is disabled', async () => {
    process.env.GENERATION_ENABLED = 'false'

    mockAuthenticatedUser({
      id: 'user-1',
      isApproved: true,
      isBlocked: false,
      creditsRemaining: 100,
      creditsUsedTotal: 0,
    })

    const request = createRequest(
      { prompt: 'test', inputBase64: 'abc' },
      { Authorization: 'Bearer session-token' }
    )
    const response = await POST(request)
    expect(response.status).toBe(503)
  })

  it('should return 429 when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(
      NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '30' } }
      )
    )

    mockAuthenticatedUser({
      id: 'user-1',
      isApproved: true,
      isBlocked: false,
      creditsRemaining: 100,
      creditsUsedTotal: 0,
    })

    const request = createRequest(
      { prompt: 'test', inputBase64: 'abc' },
      { Authorization: 'Bearer session-token' }
    )
    const response = await POST(request)
    expect(response.status).toBe(429)
  })
})
