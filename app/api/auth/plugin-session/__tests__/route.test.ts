import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}))

vi.mock('@/lib/db/schema', () => ({
  pluginAuthSessions: {
    sessionToken: 'sessionToken',
    id: 'id',
    apiKeyPlaintext: 'apiKeyPlaintext',
    apiKeyId: 'apiKeyId',
  },
  apiKeys: {
    id: 'id',
    keyPrefix: 'keyPrefix',
    name: 'name',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
  RATE_LIMITS: {
    pluginSession: { maxRequests: 20, window: '1 m', prefix: 'test' },
  },
}))

vi.mock('crypto', () => ({
  randomBytes: vi.fn().mockReturnValue({
    toString: vi.fn().mockReturnValue('mock-session-token-abc123'),
  }),
}))

import { POST, GET } from '../route'
import { db } from '@/lib/db'

describe('POST /api/auth/plugin-session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://vividon.ai'
  })

  it('should create a new session and return token + authUrl', async () => {
    const mockSession = {
      sessionToken: 'mock-session-token-abc123',
      expiresAt: new Date(Date.now() + 600000),
    }

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockSession]),
      }),
    } as any)

    const request = new NextRequest('http://localhost:3000/api/auth/plugin-session', {
      method: 'POST',
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.sessionToken).toBeDefined()
    expect(data.authUrl).toContain('vividon.ai')
    expect(data.expiresAt).toBeDefined()
  })
})

describe('GET /api/auth/plugin-session', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 400 when token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/plugin-session')
    const response = await GET(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Token required')
  })

  it('should return 404 when session not found', async () => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any)

    const request = new NextRequest(
      'http://localhost:3000/api/auth/plugin-session?token=nonexistent'
    )
    const response = await GET(request)
    expect(response.status).toBe(404)
  })

  it('should return pending status for active pending session', async () => {
    const mockSession = {
      status: 'pending',
      expiresAt: new Date(Date.now() + 600000),
    }

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockSession]),
        }),
      }),
    } as any)

    const request = new NextRequest(
      'http://localhost:3000/api/auth/plugin-session?token=valid-token'
    )
    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.status).toBe('pending')
  })

  it('should return 410 for expired session', async () => {
    const mockSession = {
      status: 'pending',
      expiresAt: new Date(Date.now() - 1000),
    }

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockSession]),
        }),
      }),
    } as any)

    const request = new NextRequest(
      'http://localhost:3000/api/auth/plugin-session?token=expired-token'
    )
    const response = await GET(request)
    expect(response.status).toBe(410)
  })

  it('should return 410 when key already retrieved', async () => {
    const mockSession = {
      status: 'completed',
      apiKeyPlaintext: null,
      expiresAt: new Date(Date.now() + 600000),
    }

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockSession]),
        }),
      }),
    } as any)

    const request = new NextRequest(
      'http://localhost:3000/api/auth/plugin-session?token=completed-token'
    )
    const response = await GET(request)
    expect(response.status).toBe(410)
  })
})
