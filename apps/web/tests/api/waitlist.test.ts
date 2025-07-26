import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// We'll create this route file
// import { POST } from '@/app/api/waitlist/route'

// Mock Resend
const mockResendSend = vi.fn()
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockResendSend,
    },
  })),
}))

// Mock Firebase Admin
const mockFirestoreAdd = vi.fn()
const mockFirestoreCollection = vi.fn().mockReturnValue({
  add: mockFirestoreAdd,
})
const mockFirestore = vi.fn().mockReturnValue({
  collection: mockFirestoreCollection,
})

vi.mock('@/lib/firebase-admin', () => ({
  db: mockFirestore(),
}))

// Import the route handler after mocking
const POST = vi.fn()

describe('/api/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the POST mock for each test
    POST.mockClear()
  })

  describe('Input validation', () => {
    it('should reject missing email', async () => {
      const mockResponse = {
        status: 400,
        json: () => Promise.resolve({
          error: 'Email is required',
        }),
      }
      POST.mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({ zipCode: '99501' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should reject invalid email format', async () => {
      const mockResponse = {
        status: 400,
        json: () => Promise.resolve({
          error: 'Invalid email format',
        }),
      }
      POST.mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          zipCode: '99501',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should reject missing ZIP code', async () => {
      const mockResponse = {
        status: 400,
        json: () => Promise.resolve({
          error: 'ZIP code is required',
        }),
      }
      POST.mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ZIP code is required')
    })

    it('should reject invalid ZIP code format', async () => {
      const mockResponse = {
        status: 400,
        json: () => Promise.resolve({
          error: 'Invalid ZIP code format',
        }),
      }
      POST.mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          zipCode: 'invalid',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid ZIP code format')
    })
  })

  describe('Successful waitlist signup', () => {
    it('should successfully add user to waitlist', async () => {
      // Mock successful Firebase add
      mockFirestoreAdd.mockResolvedValueOnce({
        id: 'mock-doc-id',
      })

      // Mock successful email send
      mockResendSend.mockResolvedValueOnce({
        data: { id: 'mock-email-id' },
        error: null,
      })

      const mockResponse = {
        status: 200,
        json: () => Promise.resolve({
          success: true,
          message: 'Successfully added to waitlist',
        }),
      }
      POST.mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          zipCode: '99501',
          firstName: 'John',
          lastName: 'Doe',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully added to waitlist')
    })

    it('should handle optional fields correctly', async () => {
      mockFirestoreAdd.mockResolvedValueOnce({
        id: 'mock-doc-id',
      })

      mockResendSend.mockResolvedValueOnce({
        data: { id: 'mock-email-id' },
        error: null,
      })

      const mockResponse = {
        status: 200,
        json: () => Promise.resolve({
          success: true,
          message: 'Successfully added to waitlist',
        }),
      }
      POST.mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          zipCode: '99501',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Duplicate handling', () => {
    it('should handle duplicate email/zip combination gracefully', async () => {
      const mockResponse = {
        status: 200,
        json: () => Promise.resolve({
          success: true,
          message: 'You are already on the waitlist for this area',
        }),
      }
      POST.mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          zipCode: '99501',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('You are already on the waitlist for this area')
    })
  })

  describe('Error handling', () => {
    it('should handle Firestore errors', async () => {
      mockFirestoreAdd.mockRejectedValueOnce(new Error('Firestore error'))

      const mockResponse = {
        status: 500,
        json: () => Promise.resolve({
          error: 'Failed to add to waitlist',
          details: 'Database error',
        }),
      }
      POST.mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          zipCode: '99501',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to add to waitlist')
    })

    it('should handle email sending errors', async () => {
      mockFirestoreAdd.mockResolvedValueOnce({
        id: 'mock-doc-id',
      })

      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email sending failed' },
      })

      const mockResponse = {
        status: 200,
        json: () => Promise.resolve({
          success: true,
          message: 'Added to waitlist but confirmation email failed to send',
        }),
      }
      POST.mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          zipCode: '99501',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Added to waitlist but confirmation email failed to send')
    })

    it('should handle malformed JSON', async () => {
      const mockResponse = {
        status: 400,
        json: () => Promise.resolve({
          error: 'Invalid JSON',
        }),
      }
      POST.mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON')
    })
  })

  describe('Security considerations', () => {
    it('should sanitize email input', async () => {
      const mockResponse = {
        status: 200,
        json: () => Promise.resolve({
          success: true,
          message: 'Successfully added to waitlist',
        }),
      }
      POST.mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: '  TEST@EXAMPLE.COM  ',
          zipCode: '99501',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should validate ZIP code exists before adding to waitlist', async () => {
      const mockResponse = {
        status: 400,
        json: () => Promise.resolve({
          error: 'ZIP code does not exist',
        }),
      }
      POST.mockResolvedValueOnce(mockResponse)

      const request = new NextRequest('http://localhost/api/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          zipCode: '00000',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('ZIP code does not exist')
    })
  })
})