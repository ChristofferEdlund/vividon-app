import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/api-keys', () => ({
  createApiKey: vi.fn(),
  listApiKeys: vi.fn(),
}))

import { GET, POST } from '../route'
import { createClient } from '@/lib/supabase/server'
import { createApiKey, listApiKeys } from '@/lib/api-keys'

function mockUser(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
  } as any)
}

describe('GET /api/keys', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    mockUser(null)
    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('should return list of keys for authenticated user', async () => {
    mockUser({ id: 'user-1' })

    const mockKeys = [
      { id: 'key-1', prefix: 'viv_abc12345', name: 'Test Key', createdAt: new Date() },
    ]
    vi.mocked(listApiKeys).mockResolvedValue(mockKeys as any)

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.keys).toHaveLength(1)
    expect(data.keys[0].name).toBe('Test Key')
  })
})

describe('POST /api/keys', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    mockUser(null)

    const request = new NextRequest('http://localhost:3000/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should return 400 when name is missing', async () => {
    mockUser({ id: 'user-1' })

    const request = new NextRequest('http://localhost:3000/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Name is required')
  })

  it('should return 400 when name is empty string', async () => {
    mockUser({ id: 'user-1' })

    const request = new NextRequest('http://localhost:3000/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should create a key for authenticated user with valid name', async () => {
    mockUser({ id: 'user-1' })

    const mockKey = {
      id: 'key-1',
      key: 'viv_fullkeyvalue',
      prefix: 'viv_abc',
      name: 'My Key',
      createdAt: new Date(),
    }
    vi.mocked(createApiKey).mockResolvedValue(mockKey as any)

    const request = new NextRequest('http://localhost:3000/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Key' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(createApiKey).toHaveBeenCalledWith('user-1', 'My Key', undefined)
  })

  it('should pass expiration date when provided', async () => {
    mockUser({ id: 'user-1' })

    vi.mocked(createApiKey).mockResolvedValue({
      id: 'key-1',
      key: 'viv_test',
      prefix: 'viv_abc',
      name: 'Expiring Key',
    } as any)

    const expiresAt = '2026-12-31T00:00:00.000Z'
    const request = new NextRequest('http://localhost:3000/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Expiring Key', expiresAt }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(createApiKey).toHaveBeenCalledWith(
      'user-1',
      'Expiring Key',
      expect.any(Date)
    )
  })
})
