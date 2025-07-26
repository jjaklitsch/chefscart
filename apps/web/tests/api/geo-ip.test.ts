import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/geo-ip/route'

// Mock fetch for IP geolocation API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('/api/geo-ip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('IP address detection', () => {
    it('should handle localhost/development IP', async () => {
      const request = new NextRequest('http://localhost/api/geo-ip', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '127.0.0.1',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.zipCode).toBe('10001')
      expect(data.city).toBe('New York')
      expect(data.state).toBe('NY')
    })

    it('should handle private network IP', async () => {
      const request = new NextRequest('http://localhost/api/geo-ip', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.zipCode).toBe('10001')
      expect(data.city).toBe('New York')
      expect(data.state).toBe('NY')
    })

    it('should handle multiple IPs in x-forwarded-for', async () => {
      // Mock successful IP API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          zip: '90210',
          city: 'Beverly Hills',
          region: 'CA',
          country: 'United States',
        }),
      })

      const request = new NextRequest('http://localhost/api/geo-ip', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '1.2.3.4, 192.168.1.1, 10.0.0.1',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.zipCode).toBe('90210')
      expect(data.city).toBe('Beverly Hills')
      expect(data.state).toBe('CA')
      expect(mockFetch).toHaveBeenCalledWith('https://ipapi.co/1.2.3.4/json/')
    })

    it('should fallback when no x-forwarded-for header', async () => {
      const request = new NextRequest('http://localhost/api/geo-ip', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.zipCode).toBe('10001')
      expect(data.city).toBe('New York')
      expect(data.state).toBe('NY')
    })
  })

  describe('IP geolocation API integration', () => {
    it('should successfully get location from IP API', async () => {
      // Mock successful IP API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          zip: '94102',
          city: 'San Francisco',
          region: 'CA',
          country: 'United States',
        }),
      })

      const request = new NextRequest('http://localhost/api/geo-ip', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '8.8.8.8',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.zipCode).toBe('94102')
      expect(data.city).toBe('San Francisco')
      expect(data.state).toBe('CA')
      expect(mockFetch).toHaveBeenCalledWith('https://ipapi.co/8.8.8.8/json/')
    })

    it('should handle API failure response', async () => {
      // Mock failed IP API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'fail',
          message: 'Invalid IP address',
        }),
      })

      const request = new NextRequest('http://localhost/api/geo-ip', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '999.999.999.999',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.zipCode).toBe(null)
      expect(data.city).toBe(null)
      expect(data.state).toBe(null)
    })

    it('should handle network error gracefully', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const request = new NextRequest('http://localhost/api/geo-ip', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '8.8.8.8',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.zipCode).toBe(null)
      expect(data.city).toBe(null)
      expect(data.state).toBe(null)
    })

    it('should handle API response without ZIP code', async () => {
      // Mock API response without ZIP
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          city: 'Unknown City',
          region: 'XX',
          country: 'United States',
        }),
      })

      const request = new NextRequest('http://localhost/api/geo-ip', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '8.8.8.8',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.zipCode).toBe(null)
      expect(data.city).toBe(null)
      expect(data.state).toBe(null)
    })

    it('should handle malformed API response', async () => {
      // Mock malformed response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const request = new NextRequest('http://localhost/api/geo-ip', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '8.8.8.8',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.zipCode).toBe(null)
      expect(data.city).toBe(null)
      expect(data.state).toBe(null)
    })
  })

  describe('Error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Mock an error in request processing
      const request = new NextRequest('http://localhost/api/geo-ip', {
        method: 'GET',
      })

      // Spy on console.error to verify error logging
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Force an error by mocking a failing header access
      vi.spyOn(request.headers, 'get').mockImplementationOnce(() => {
        throw new Error('Header access error')
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.zipCode).toBe(null)
      expect(data.city).toBe(null)
      expect(data.state).toBe(null)
      expect(consoleSpy).toHaveBeenCalledWith('Geo-IP error:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('Rate limiting considerations', () => {
    it('should use efficient API endpoints', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          zip: '60601',
          city: 'Chicago',
          region: 'IL',
        }),
      })

      const request = new NextRequest('http://localhost/api/geo-ip', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '12.34.56.78',
        },
      })

      await GET(request)

      // Verify we're using the free tier endpoint
      expect(mockFetch).toHaveBeenCalledWith('https://ipapi.co/12.34.56.78/json/')
    })
  })
})