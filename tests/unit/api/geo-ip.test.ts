import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/geo-ip/route'
import { NextRequest } from 'next/server'

describe('/api/geo-ip API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (headers: Record<string, string> = {}) => {
    return new NextRequest('http://localhost:3000/api/geo-ip', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    })
  }

  describe('IP Detection', () => {
    it('should detect ZIP code from IP address', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '8.8.8.8'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        zipCode: expect.any(String),
        city: expect.any(String),
        state: expect.any(String)
      })
    })

    it('should handle localhost requests', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '127.0.0.1'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should provide a default or handle gracefully
      expect(data).toHaveProperty('zipCode')
    })

    it('should handle requests without IP headers', async () => {
      const request = createMockRequest()

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should handle gracefully when no IP is detected
      expect(data).toHaveProperty('zipCode')
    })
  })

  describe('IP Header Processing', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '203.0.113.1, 198.51.100.2'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ipAddress).toBe('203.0.113.1')
    })

    it('should handle x-real-ip header', async () => {
      const request = createMockRequest({
        'x-real-ip': '203.0.113.1'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ipAddress).toBe('203.0.113.1')
    })

    it('should prefer x-forwarded-for over x-real-ip', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '203.0.113.1',
        'x-real-ip': '198.51.100.2'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ipAddress).toBe('203.0.113.1')
    })

    it('should handle malformed IP addresses', async () => {
      const request = createMockRequest({
        'x-forwarded-for': 'invalid-ip'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should handle gracefully and not crash
      expect(data).toHaveProperty('zipCode')
    })
  })

  describe('Private IP Handling', () => {
    it('should handle private IP ranges', async () => {
      const privateIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1']

      for (const ip of privateIPs) {
        const request = createMockRequest({
          'x-forwarded-for': ip
        })

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        // Should provide default location for private IPs
        expect(data).toHaveProperty('zipCode')
      }
    })

    it('should handle IPv6 addresses', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('zipCode')
    })
  })

  describe('Response Format', () => {
    it('should return consistent response structure', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '8.8.8.8'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        zipCode: expect.any(String),
        city: expect.any(String),
        state: expect.any(String),
        country: expect.any(String),
        ipAddress: expect.any(String)
      })

      expect(response.headers.get('Content-Type')).toContain('application/json')
    })

    it('should validate ZIP code format in response', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '8.8.8.8'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      if (data.zipCode) {
        // ZIP code should be 5 digits if provided
        expect(data.zipCode).toMatch(/^\d{5}$/)
      }
    })

    it('should include confidence indicators', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '8.8.8.8'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // May include accuracy/confidence metrics
      if (data.accuracy) {
        expect(typeof data.accuracy).toBe('number')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle geo-IP service unavailability', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '8.8.8.8'
      })

      const response = await GET(request)
      
      // Should either succeed or provide graceful fallback
      if (response.status !== 200) {
        expect(response.status).toBe(503)
        const data = await response.json()
        expect(data.error).toBeDefined()
      }
    })

    it('should provide fallback location data', async () => {
      const request = createMockRequest()

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should provide some default location even if detection fails
      expect(data).toHaveProperty('zipCode')
      expect(data).toHaveProperty('city')
      expect(data).toHaveProperty('state')
    })

    it('should handle rate limiting gracefully', async () => {
      // Simulate multiple rapid requests
      const requests = Array.from({ length: 10 }, () => 
        createMockRequest({
          'x-forwarded-for': '8.8.8.8'
        })
      )

      const promises = requests.map(request => GET(request))
      const responses = await Promise.all(promises)

      responses.forEach(response => {
        expect([200, 429, 503]).toContain(response.status)
      })
    })
  })

  describe('Performance', () => {
    it('should respond within reasonable time limits', async () => {
      const start = Date.now()
      const request = createMockRequest({
        'x-forwarded-for': '8.8.8.8'
      })
      const response = await GET(request)
      const end = Date.now()

      expect(end - start).toBeLessThan(5000) // Should respond within 5 seconds
    })

    it('should cache responses appropriately', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '8.8.8.8'
      })

      // Make two identical requests
      const response1 = await GET(request)
      const response2 = await GET(request)

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)

      const data1 = await response1.json()
      const data2 = await response2.json()

      // Should return consistent results
      expect(data1.zipCode).toBe(data2.zipCode)
    })
  })

  describe('Security', () => {
    it('should not expose sensitive information', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '8.8.8.8'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      
      // Should not expose internal service details
      expect(data).not.toHaveProperty('apiKey')
      expect(data).not.toHaveProperty('internalId')
      expect(data).not.toHaveProperty('serverInfo')
    })

    it('should sanitize IP addresses', async () => {
      const maliciousHeaders = [
        'x-forwarded-for: <script>alert("xss")</script>',
        'x-forwarded-for: 8.8.8.8; DROP TABLE users;',
        'x-forwarded-for: ../../../etc/passwd'
      ]

      for (const header of maliciousHeaders) {
        const [name, value] = header.split(': ')
        const request = createMockRequest({
          [name]: value
        })

        const response = await GET(request)
        
        // Should not crash and should handle malicious input
        expect([200, 400]).toContain(response.status)
      }
    })

    it('should handle oversized headers', async () => {
      const longIP = 'x'.repeat(1000)
      const request = createMockRequest({
        'x-forwarded-for': longIP
      })

      const response = await GET(request)
      
      // Should handle gracefully
      expect([200, 400]).toContain(response.status)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty header values', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '',
        'x-real-ip': ''
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('zipCode')
    })

    it('should handle multiple comma-separated IPs', async () => {
      const request = createMockRequest({
        'x-forwarded-for': '203.0.113.1, 198.51.100.2, 8.8.8.8'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should use the first non-private IP
      expect(data.ipAddress).toBe('203.0.113.1')
    })

    it('should handle international IP addresses', async () => {
      // Use a known international IP
      const request = createMockRequest({
        'x-forwarded-for': '1.1.1.1' // Cloudflare DNS - international
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('country')
    })
  })
})