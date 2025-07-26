import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/validate-zip/route'

// Mock fetch for USPS API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('/api/validate-zip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Input validation', () => {
    it('should reject empty ZIP code', async () => {
      const request = new NextRequest('http://localhost/api/validate-zip', {
        method: 'POST',
        body: JSON.stringify({ zipCode: '' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.isValid).toBe(false)
      expect(data.hasInstacartCoverage).toBe(false)
      expect(data.message).toBe('Invalid ZIP code format')
    })

    it('should reject non-numeric ZIP code', async () => {
      const request = new NextRequest('http://localhost/api/validate-zip', {
        method: 'POST',
        body: JSON.stringify({ zipCode: 'abcde' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.isValid).toBe(false)
      expect(data.hasInstacartCoverage).toBe(false)
      expect(data.message).toBe('Invalid ZIP code format')
    })

    it('should reject ZIP code with wrong length', async () => {
      const request = new NextRequest('http://localhost/api/validate-zip', {
        method: 'POST',
        body: JSON.stringify({ zipCode: '123' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.isValid).toBe(false)
      expect(data.hasInstacartCoverage).toBe(false)
      expect(data.message).toBe('Invalid ZIP code format')
    })

    it('should reject ZIP code with special characters', async () => {
      const request = new NextRequest('http://localhost/api/validate-zip', {
        method: 'POST',
        body: JSON.stringify({ zipCode: '12-45' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.isValid).toBe(false)
      expect(data.hasInstacartCoverage).toBe(false)
      expect(data.message).toBe('Invalid ZIP code format')
    })
  })

  describe('USPS validation', () => {
    it('should validate real ZIP code via USPS API', async () => {
      // Mock successful USPS response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`
          <?xml version="1.0" encoding="UTF-8"?>
          <CityStateLookupResponse>
            <ZipCode ID="0">
              <Zip5>10001</Zip5>
              <City>NEW YORK</City>
              <State>NY</State>
            </ZipCode>
          </CityStateLookupResponse>
        `),
      })

      const request = new NextRequest('http://localhost/api/validate-zip', {
        method: 'POST',
        body: JSON.stringify({ zipCode: '10001' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isValid).toBe(true)
      expect(data.hasInstacartCoverage).toBe(true)
      expect(data.city).toBe('NEW YORK')
      expect(data.state).toBe('NY')
      expect(data.message).toBe('Instacart delivers to this area')
    })

    it('should handle invalid ZIP code from USPS API', async () => {
      // Mock USPS error response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`
          <?xml version="1.0" encoding="UTF-8"?>
          <CityStateLookupResponse>
            <ZipCode ID="0">
              <Error>
                <Number>-2147219401</Number>
                <Description>Invalid Zip Code.</Description>
                <Source>clsAMS</Source>
              </Error>
            </ZipCode>
          </CityStateLookupResponse>
        `),
      })

      const request = new NextRequest('http://localhost/api/validate-zip', {
        method: 'POST',
        body: JSON.stringify({ zipCode: '99999' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.isValid).toBe(false)
      expect(data.hasInstacartCoverage).toBe(false)
      expect(data.message).toBe('Invalid ZIP code')
    })

    it('should handle USPS API failure gracefully', async () => {
      // Mock USPS API failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const request = new NextRequest('http://localhost/api/validate-zip', {
        method: 'POST',
        body: JSON.stringify({ zipCode: '10001' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.isValid).toBe(false)
      expect(data.hasInstacartCoverage).toBe(false)
      expect(data.message).toBe('Error validating ZIP code')
    })
  })

  describe('Instacart coverage', () => {
    it('should return coverage for supported ZIP code', async () => {
      // Mock successful USPS response for supported ZIP
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`
          <?xml version="1.0" encoding="UTF-8"?>
          <CityStateLookupResponse>
            <ZipCode ID="0">
              <Zip5>10001</Zip5>
              <City>NEW YORK</City>
              <State>NY</State>
            </ZipCode>
          </CityStateLookupResponse>
        `),
      })

      const request = new NextRequest('http://localhost/api/validate-zip', {
        method: 'POST',
        body: JSON.stringify({ zipCode: '10001' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.hasInstacartCoverage).toBe(true)
      expect(data.message).toBe('Instacart delivers to this area')
    })

    it('should return no coverage for unsupported ZIP code', async () => {
      // Mock successful USPS response for unsupported ZIP
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`
          <?xml version="1.0" encoding="UTF-8"?>
          <CityStateLookupResponse>
            <ZipCode ID="0">
              <Zip5>99501</Zip5>
              <City>ANCHORAGE</City>
              <State>AK</State>
            </ZipCode>
          </CityStateLookupResponse>
        `),
      })

      const request = new NextRequest('http://localhost/api/validate-zip', {
        method: 'POST',
        body: JSON.stringify({ zipCode: '99501' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.isValid).toBe(true)
      expect(data.hasInstacartCoverage).toBe(false)
      expect(data.message).toBe('Instacart does not deliver to this area yet')
    })
  })

  describe('Request parsing', () => {
    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/validate-zip', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.isValid).toBe(false)
      expect(data.hasInstacartCoverage).toBe(false)
      expect(data.message).toBe('Error validating ZIP code')
    })

    it('should handle missing zipCode field', async () => {
      const request = new NextRequest('http://localhost/api/validate-zip', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.isValid).toBe(false)
      expect(data.hasInstacartCoverage).toBe(false)
      expect(data.message).toBe('Invalid ZIP code format')
    })
  })
})