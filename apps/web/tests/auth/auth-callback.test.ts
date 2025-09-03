/**
 * Comprehensive Auth Callback API Route Tests
 * Testing PKCE flow, OAuth callback handling, magic links, and error scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../../src/app/auth/callback/route'
import { createServerAuthClient } from '../../lib/supabase-server'

// Mock the server auth client
vi.mock('../../lib/supabase-server', () => ({
  createServerAuthClient: vi.fn()
}))

const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    verifyOtp: vi.fn()
  }
}

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
}

describe('/auth/callback API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createServerAuthClient.mockReturnValue(mockSupabaseClient)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Error Handling from Supabase', () => {
    it('should handle access_denied error', async () => {
      const request = new NextRequest('http://localhost:3001/auth/callback?error=access_denied&error_description=Access%20denied')

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/login?error=auth_failed')
      expect(consoleSpy.error).toHaveBeenCalledWith('Auth callback error from Supabase:', {
        error: 'access_denied',
        errorDescription: 'Access denied'
      })
    })

    it('should handle OTP expired error', async () => {
      const request = new NextRequest('http://localhost:3001/auth/callback?error=access_denied&error_code=otp_expired')

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/login?error=link_expired')
    })

    it('should handle generic auth errors', async () => {
      const request = new NextRequest('http://localhost:3001/auth/callback?error=invalid_grant&error_description=Invalid%20grant')

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/login?error=auth_failed')
    })
  })

  describe('Existing Session Handling', () => {
    it('should redirect to dashboard when session exists', async () => {
      const mockSession = {
        user: {
          id: '123',
          email: 'test@example.com',
          created_at: new Date().toISOString()
        }
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const request = new NextRequest('http://localhost:3001/auth/callback')

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/dashboard')
      expect(consoleSpy.log).toHaveBeenCalledWith('Session check result:', {
        hasSession: true,
        hasUser: true,
        userEmail: 'test@example.com',
        error: 'none'
      })
    })

    it('should redirect new users to dashboard with welcome flag', async () => {
      const newUserCreatedAt = new Date(Date.now() - 30000).toISOString() // 30 seconds ago
      
      const mockSession = {
        user: {
          id: '123',
          email: 'newuser@example.com',
          created_at: newUserCreatedAt
        }
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const request = new NextRequest('http://localhost:3001/auth/callback')

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/dashboard?welcome=true')
    })

    it('should handle session check error', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' }
      })

      const request = new NextRequest('http://localhost:3001/auth/callback?code=auth_code')

      const response = await GET(request)

      expect(consoleSpy.error).toHaveBeenCalledWith('Error checking for existing session:', expect.any(Error))
    })
  })

  describe('OAuth Code Exchange', () => {
    it('should handle successful OAuth code exchange', async () => {
      const mockSession = {
        user: {
          id: '123',
          email: 'test@example.com',
          created_at: new Date(Date.now() - 120000).toISOString() // 2 minutes ago (existing user)
        }
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const request = new NextRequest('http://localhost:3001/auth/callback?code=oauth_code_123')

      const response = await GET(request)

      expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('oauth_code_123')
      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/dashboard')
      expect(consoleSpy.log).toHaveBeenCalledWith('Token exchange result:', {
        hasData: true,
        hasSession: true,
        hasUser: true,
        error: undefined,
        errorDetails: undefined
      })
    })

    it('should handle OAuth code exchange error', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const error = { message: 'Invalid code', status: 400, code: 'invalid_grant' }

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: null,
        error
      })

      const request = new NextRequest('http://localhost:3001/auth/callback?code=invalid_code')

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/login?error=auth_failed&message=Invalid%20code')
      expect(consoleSpy.error).toHaveBeenCalledWith('Auth callback error - FULL DETAILS:', expect.objectContaining({
        message: 'Invalid code',
        status: 400,
        code: 'invalid_grant'
      }))
    })

    it('should handle new user from OAuth', async () => {
      const newUserCreatedAt = new Date(Date.now() - 30000).toISOString() // 30 seconds ago

      const mockSession = {
        user: {
          id: '123',
          email: 'newuser@example.com',
          created_at: newUserCreatedAt
        }
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const request = new NextRequest('http://localhost:3001/auth/callback?code=oauth_code_new_user')

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/dashboard?welcome=true')
    })

    it('should handle missing session after code exchange', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3001/auth/callback?code=oauth_code')

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/login?error=no_session')
      expect(consoleSpy.error).toHaveBeenCalledWith('No session found after token exchange')
    })
  })

  describe('Magic Link Token Hash Handling', () => {
    it('should handle successful magic link verification', async () => {
      const mockSession = {
        user: {
          id: '123',
          email: 'test@example.com',
          created_at: new Date(Date.now() - 120000).toISOString()
        }
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const request = new NextRequest('http://localhost:3001/auth/callback?token_hash=abc123&type=magiclink')

      const response = await GET(request)

      expect(mockSupabaseClient.auth.verifyOtp).toHaveBeenCalledWith({
        token_hash: 'abc123',
        type: 'magiclink'
      })
      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/dashboard')
    })

    it('should handle magic link verification error', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: { message: 'Token expired' }
      })

      const request = new NextRequest('http://localhost:3001/auth/callback?token_hash=expired123&type=magiclink')

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/login?error=auth_failed&message=Token%20expired')
    })
  })

  describe('PKCE Magic Link Handling', () => {
    it('should handle PKCE magic link with no session', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3001/auth/callback?token=pkce_token_123&type=magiclink')

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/login?error=auth_failed&message=Magic%20link%20verification%20failed')
      expect(consoleSpy.log).toHaveBeenCalledWith('PKCE magic link verification failed - no session found after Supabase verification')
    })
  })

  describe('Missing Parameters', () => {
    it('should handle missing auth parameters', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3001/auth/callback')

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/login?error=no_params')
      expect(consoleSpy.log).toHaveBeenCalledWith('No auth parameters found. Expected code, token, or token_hash.', expect.any(Object))
    })
  })

  describe('Exception Handling', () => {
    it('should handle unexpected exceptions', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3001/auth/callback?code=oauth_code')

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toBe('http://localhost:3001/login?error=auth_failed')
      expect(consoleSpy.error).toHaveBeenCalledWith('Auth callback exception:', expect.any(Error))
    })
  })

  describe('Parameter Logging', () => {
    it('should log all callback parameters for debugging', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3001/auth/callback?code=test_code&token=test_token&custom_param=value')

      await GET(request)

      expect(consoleSpy.log).toHaveBeenCalledWith('Params:', {
        code: 'present (test_code...)',
        token: 'present (test_token...)',
        tokenHash: 'missing',
        type: null,
        error: null,
        errorDescription: null,
        allParams: {
          code: 'test_code',
          token: 'test_token',
          custom_param: 'value'
        }
      })
    })

    it('should truncate long tokens in logs', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const longCode = 'a'.repeat(50)
      const request = new NextRequest(`http://localhost:3001/auth/callback?code=${longCode}`)

      await GET(request)

      expect(consoleSpy.log).toHaveBeenCalledWith('Params:', expect.objectContaining({
        code: `present (${longCode.substring(0, 20)}...)`
      }))
    })
  })

  describe('User Age Calculation', () => {
    it('should correctly identify new vs existing users', async () => {
      // Test new user (less than 1 minute old)
      const newUserTime = new Date(Date.now() - 30000).toISOString() // 30 seconds ago
      const oldUserTime = new Date(Date.now() - 120000).toISOString() // 2 minutes ago

      const newUserSession = {
        user: {
          id: '1',
          email: 'new@example.com',
          created_at: newUserTime
        }
      }

      const oldUserSession = {
        user: {
          id: '2',
          email: 'old@example.com',
          created_at: oldUserTime
        }
      }

      // Test new user
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: newUserSession },
        error: null
      })

      let request = new NextRequest('http://localhost:3001/auth/callback')
      let response = await GET(request)
      
      expect(response.headers.get('location')).toBe('http://localhost:3001/dashboard?welcome=true')

      // Test existing user
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: oldUserSession },
        error: null
      })

      request = new NextRequest('http://localhost:3001/auth/callback')
      response = await GET(request)
      
      expect(response.headers.get('location')).toBe('http://localhost:3001/dashboard')
    })
  })
})