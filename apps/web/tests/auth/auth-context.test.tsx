/**
 * Comprehensive AuthContext Tests
 * Testing authentication context, session management, and error handling
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'
import { createAuthClient } from '../../lib/supabase'

// Mock Supabase client
vi.mock('../../lib/supabase', () => ({
  createAuthClient: vi.fn()
}))

const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signInWithOtp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn()
  }
}

// Test component to access context
const TestComponent = () => {
  const auth = useAuth()
  return (
    <div>
      <div data-testid="user">{auth.user ? auth.user.email : 'null'}</div>
      <div data-testid="loading">{auth.loading ? 'true' : 'false'}</div>
      <div data-testid="session">{auth.session ? 'exists' : 'null'}</div>
      <button onClick={() => auth.signIn('test@example.com', 'password')}>Sign In</button>
      <button onClick={() => auth.signUp('test@example.com', 'password')}>Sign Up</button>
      <button onClick={() => auth.signInWithOAuth('google')}>OAuth</button>
      <button onClick={() => auth.sendMagicLink('test@example.com')}>Magic Link</button>
      <button onClick={() => auth.resetPassword('test@example.com')}>Reset Password</button>
      <button onClick={auth.signOut}>Sign Out</button>
      <button onClick={() => auth.updateProfile({ name: 'Test User' })}>Update Profile</button>
    </div>
  )
}

describe('AuthContext', () => {
  let mockSubscription: { unsubscribe: vi.Mock }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockSubscription = { unsubscribe: vi.fn() }
    
    createAuthClient.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.auth.getSession.mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    })
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: mockSubscription }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Provider Initialization', () => {
    it('should initialize with loading state', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('loading')).toHaveTextContent('true')
      expect(screen.getByTestId('user')).toHaveTextContent('null')
      expect(screen.getByTestId('session')).toHaveTextContent('null')
    })

    it('should fetch initial session on mount', async () => {
      const mockSession = {
        user: { id: '1', email: 'test@example.com' },
        access_token: 'token'
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('session')).toHaveTextContent('exists')
      })
    })

    it('should handle session fetch error', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' }
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
        expect(consoleSpy).toHaveBeenCalledWith('Error getting session:', { message: 'Session error' })
      })

      consoleSpy.mockRestore()
    })

    it('should handle unexpected session fetch error', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error('Unexpected error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
        expect(consoleSpy).toHaveBeenCalledWith('Unexpected error getting session:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Auth State Changes', () => {
    it('should handle SIGNED_IN event', async () => {
      const mockSession = {
        user: { id: '1', email: 'test@example.com' },
        access_token: 'token'
      }

      let authStateCallback: (event: string, session: any) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: mockSubscription } }
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      act(() => {
        authStateCallback('SIGNED_IN', mockSession)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('session')).toHaveTextContent('exists')
        expect(consoleSpy).toHaveBeenCalledWith('Auth state change:', 'SIGNED_IN', 'test@example.com')
        expect(consoleSpy).toHaveBeenCalledWith('User signed in:', 'test@example.com')
      })

      consoleSpy.mockRestore()
    })

    it('should handle SIGNED_OUT event', async () => {
      let authStateCallback: (event: string, session: any) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: mockSubscription } }
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      act(() => {
        authStateCallback('SIGNED_OUT', null)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null')
        expect(screen.getByTestId('session')).toHaveTextContent('null')
        expect(consoleSpy).toHaveBeenCalledWith('User signed out')
      })

      consoleSpy.mockRestore()
    })

    it('should handle TOKEN_REFRESHED event', async () => {
      const mockSession = {
        user: { id: '1', email: 'test@example.com' },
        access_token: 'new-token'
      }

      let authStateCallback: (event: string, session: any) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: mockSubscription } }
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      act(() => {
        authStateCallback('TOKEN_REFRESHED', mockSession)
      })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Token refreshed for:', 'test@example.com')
      })

      consoleSpy.mockRestore()
    })

    it('should handle USER_UPDATED event', async () => {
      const mockSession = {
        user: { id: '1', email: 'updated@example.com' },
        access_token: 'token'
      }

      let authStateCallback: (event: string, session: any) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: mockSubscription } }
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      act(() => {
        authStateCallback('USER_UPDATED', mockSession)
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('updated@example.com')
        expect(consoleSpy).toHaveBeenCalledWith('User updated:', 'updated@example.com')
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Authentication Methods', () => {
    it('should handle successful sign up', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        error: null
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const signUpButton = screen.getByText('Sign Up')
      await act(async () => {
        signUpButton.click()
      })

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: { data: undefined }
      })
    })

    it('should handle sign up with metadata', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        error: null
      })

      const TestComponentWithMetadata = () => {
        const auth = useAuth()
        return (
          <button onClick={() => auth.signUp('test@example.com', 'password', { name: 'Test User' })}>
            Sign Up With Metadata
          </button>
        )
      }

      render(
        <AuthProvider>
          <TestComponentWithMetadata />
        </AuthProvider>
      )

      const signUpButton = screen.getByText('Sign Up With Metadata')
      await act(async () => {
        signUpButton.click()
      })

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        options: { data: { name: 'Test User' } }
      })
    })

    it('should handle successful sign in', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        error: null
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const signInButton = screen.getByText('Sign In')
      await act(async () => {
        signInButton.click()
      })

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      })
    })

    it('should handle OAuth sign in', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({ error: null })

      // Mock window.location.origin
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3001' },
        writable: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const oauthButton = screen.getByText('OAuth')
      await act(async () => {
        oauthButton.click()
      })

      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3001/auth/callback?provider=google'
        }
      })
    })

    it('should handle OAuth error', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        error: { message: 'OAuth failed' }
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const oauthButton = screen.getByText('OAuth')
      
      await expect(act(async () => {
        oauthButton.click()
      })).rejects.toThrow('OAuth failed')
    })

    it('should handle magic link send', async () => {
      mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({ error: null })

      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3001' },
        writable: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const magicLinkButton = screen.getByText('Magic Link')
      await act(async () => {
        magicLinkButton.click()
      })

      expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'http://localhost:3001/auth/callback'
        }
      })
    })

    it('should handle magic link error', async () => {
      mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
        error: { message: 'Magic link failed' }
      })

      const TestComponentWithCallback = () => {
        const auth = useAuth()
        const [result, setResult] = React.useState<string | null>(null)
        
        const handleMagicLink = async () => {
          const response = await auth.sendMagicLink('test@example.com')
          setResult(response.error)
        }

        return (
          <div>
            <button onClick={handleMagicLink}>Magic Link</button>
            <div data-testid="error">{result}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestComponentWithCallback />
        </AuthProvider>
      )

      const magicLinkButton = screen.getByText('Magic Link')
      await act(async () => {
        magicLinkButton.click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Magic link failed')
      })
    })

    it('should handle password reset', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({ error: null })

      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3001' },
        writable: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const resetButton = screen.getByText('Reset Password')
      await act(async () => {
        resetButton.click()
      })

      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo: 'http://localhost:3001/reset-password' }
      )
    })

    it('should handle sign out', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const signOutButton = screen.getByText('Sign Out')
      await act(async () => {
        signOutButton.click()
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('should handle sign out error', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' }
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const signOutButton = screen.getByText('Sign Out')
      
      await expect(act(async () => {
        signOutButton.click()
      })).rejects.toThrow('Sign out failed')
    })

    it('should handle profile update', async () => {
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { id: '1', name: 'Test User' } },
        error: null
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      const updateButton = screen.getByText('Update Profile')
      await act(async () => {
        updateButton.click()
      })

      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        data: { name: 'Test User' }
      })
    })
  })

  describe('Cleanup', () => {
    it('should unsubscribe from auth state changes on unmount', () => {
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      unmount()

      expect(mockSubscription.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('Context Error Handling', () => {
    it('should throw error when useAuth is used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })
  })
})