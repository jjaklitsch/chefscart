import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/validate-zip/route'
import { NextRequest } from 'next/server'

describe('/api/validate-zip API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/validate-zip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
  }

  describe('Valid Requests', () => {
    it('should validate ZIP codes with Instacart coverage', async () => {
      const request = createMockRequest({ zipCode: '10001' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        hasInstacartCoverage: expect.any(Boolean),
        isValid: true,
        message: expect.any(String)
      })
    })

    it('should handle ZIP codes without coverage', async () => {
      // Use a ZIP code that typically doesn't have coverage
      const request = createMockRequest({ zipCode: '99999' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        hasInstacartCoverage: expect.any(Boolean),
        isValid: true,
        message: expect.any(String)
      })
    })

    it('should validate various ZIP code formats', async () => {
      const validZips = ['10001', '90210', '12345', '00501']
      
      for (const zip of validZips) {
        const request = createMockRequest({ zipCode: zip })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.isValid).toBe(true)
        expect(data.message).toBeDefined()
      }
    })
  })

  describe('Invalid Requests', () => {
    it('should reject invalid ZIP code formats', async () => {
      const invalidZips = ['123', '123456', 'abcde', '1234a', '']
      
      for (const zip of invalidZips) {
        const request = createMockRequest({ zipCode: zip })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.isValid).toBe(false)
        expect(data.message).toBeDefined()
      }
    })

    it('should handle missing zipCode field', async () => {
      const request = createMockRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.isValid).toBe(false)
      expect(data.message).toBeDefined()
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/validate-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toBeDefined()
    })

    it('should handle null zipCode', async () => {
      const request = createMockRequest({ zipCode: null })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.isValid).toBe(false)
    })
  })

  describe('Response Format', () => {
    it('should return consistent response structure for valid ZIP', async () => {
      const request = createMockRequest({ zipCode: '10001' })
      const response = await POST(request)
      const data = await response.json()

      expect(data).toMatchObject({
        isValid: expect.any(Boolean),
        hasInstacartCoverage: expect.any(Boolean),
        message: expect.any(String)
      })

      expect(response.headers.get('Content-Type')).toContain('application/json')
    })

    it('should return error response structure for invalid ZIP', async () => {
      const request = createMockRequest({ zipCode: 'invalid' })
      const response = await POST(request)
      const data = await response.json()

      expect(data).toMatchObject({
        isValid: false,
        message: expect.any(String)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle ZIP codes with leading zeros', async () => {
      const request = createMockRequest({ zipCode: '01234' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBeDefined()
      expect(data.isValid).toBe(true)
    })

    it('should trim whitespace from ZIP codes', async () => {
      const request = createMockRequest({ zipCode: ' 10001 ' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBeDefined()
    })

    it('should handle numeric ZIP codes', async () => {
      const request = createMockRequest({ zipCode: 10001 })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should respond within reasonable time limits', async () => {
      const start = Date.now()
      const request = createMockRequest({ zipCode: '10001' })
      const response = await POST(request)
      const end = Date.now()

      expect(response.status).toBe(200)
      expect(end - start).toBeLessThan(5000) // Should respond within 5 seconds
    })

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        createMockRequest({ zipCode: `1000${i}` })
      )

      const promises = requests.map(request => POST(request))
      const responses = await Promise.all(promises)

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      const request = createMockRequest({ zipCode: 'invalid' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.message).not.toContain('database')
      expect(data.message).not.toContain('internal')
      expect(data.message).not.toContain('server')
    })

    it('should handle SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "10001' OR '1'='1",
        "10001; DELETE FROM zip_codes;"
      ]

      for (const input of maliciousInputs) {
        const request = createMockRequest({ zipCode: input })
        const response = await POST(request)
        
        expect(response.status).toBe(400)
      }
    })
  })
})