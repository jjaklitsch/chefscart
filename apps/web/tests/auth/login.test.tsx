/**
 * Comprehensive Login Page Tests
 * Testing authentication flows, error handling, security, and accessibility
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import LoginPage from '../../src/app/login/page'
import { useAuth } from '../../contexts/AuthContext'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn()
}))

vi.mock('../../contexts/AuthContext')

// Mock icons to avoid rendering issues
vi.mock('lucide-react', () => ({
  ShoppingCart: () => <div data-testid="shopping-cart-icon">ShoppingCart</div>,
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  EyeOff: () => <div data-testid="eye-off-icon">EyeOff</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>
}))

// Mock components
vi.mock('../../components/Header', () => ({
  default: () => <header data-testid="header">Header</header>
}))

vi.mock('../../components/Footer', () => ({
  default: () => <footer data-testid="footer">Footer</footer>
}))

describe('Login Page', () => {
  const mockRouterPush = vi.fn()
  const mockRouterReplace = vi.fn()
  const mockSignIn = vi.fn()
  const mockSignInWithOAuth = vi.fn()
  const mockSendMagicLink = vi.fn()
  const mockSearchParamsGet = vi.fn()

  const mockAuthContext = {
    user: null,
    session: null,
    loading: false,
    signUp: vi.fn(),
    signIn: mockSignIn,
    signInWithOAuth: mockSignInWithOAuth,
    sendMagicLink: mockSendMagicLink,
    resetPassword: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    useRouter.mockReturnValue({
      push: mockRouterPush,
      replace: mockRouterReplace
    })
    
    useSearchParams.mockReturnValue({
      get: mockSearchParamsGet
    })
    
    useAuth.mockReturnValue(mockAuthContext)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering and UI', () => {
    it('should render all main components', () => {
      render(<LoginPage />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
      expect(screen.getByText('Sign in to access your saved meal plans and preferences')).toBeInTheDocument()
    })

    it('should render login form elements', () => {
      render(<LoginPage />)
      
      expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should render OAuth buttons', () => {
      render(<LoginPage />)
      
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /continue with apple/i })).toBeInTheDocument()
    })

    it('should render navigation links', () => {
      render(<LoginPage />)
      
      expect(screen.getByRole('link', { name: /forgot your password/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /need a magic link/i })).toBeInTheDocument()
    })

    it('should show loading state while checking authentication', () => {
      useAuth.mockReturnValue({
        ...mockAuthContext,
        loading: true
      })

      render(<LoginPage />)
      
      expect(screen.getByText('Checking authentication...')).toBeInTheDocument()
      expect(screen.getByRole('generic')).toHaveClass('animate-spin')
    })

    it('should redirect authenticated users to dashboard', () => {
      useAuth.mockReturnValue({
        ...mockAuthContext,
        user: { id: '1', email: 'test@example.com' },
        loading: false
      })

      render(<LoginPage />)
      
      expect(mockRouterReplace).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('Email/Password Authentication', () => {
    it('should handle successful login', async () => {
      mockSignIn.mockResolvedValue({ data: { user: {} }, error: null })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
        expect(mockRouterPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should handle login error', async () => {
      mockSignIn.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'wrongpassword')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password. try a magic link instead/i)).toBeInTheDocument()
      })
    })

    it('should show loading state during login', async () => {
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<LoginPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(submitButton)

      expect(screen.getByText('Signing In...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form Validation', () => {
    it('should validate email format', async () => {
      render(<LoginPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'invalid-email')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
      })
      
      expect(mockSignIn).not.toHaveBeenCalled()
    })

    it('should require email and password', async () => {
      render(<LoginPage />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument()
      })
      
      expect(mockSignIn).not.toHaveBeenCalled()
    })

    it('should clear error when user starts typing', async () => {
      render(<LoginPage />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument()
      })

      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      await userEvent.type(emailInput, 'a')

      expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
    })
  })

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      render(<LoginPage />)
      
      const passwordInput = screen.getByLabelText(/password/i)
      const toggleButton = screen.getByTestId('eye-icon').parentElement

      expect(passwordInput).toHaveAttribute('type', 'password')
      
      await userEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')
      
      await userEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Magic Link Flow', () => {
    it('should switch to magic link mode', async () => {
      render(<LoginPage />)
      
      const magicLinkButton = screen.getByRole('button', { name: /need a magic link/i })
      await userEvent.click(magicLinkButton)

      expect(screen.getByText('Magic Link Login')).toBeInTheDocument()
      expect(screen.getByText('No password needed - we\'ll send you a secure link')).toBeInTheDocument()
    })

    it('should handle magic link request', async () => {
      mockSendMagicLink.mockResolvedValue({ error: null })
      
      render(<LoginPage />)
      
      const magicLinkButton = screen.getByRole('button', { name: /need a magic link/i })
      await userEvent.click(magicLinkButton)

      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const sendButton = screen.getByRole('button', { name: /send magic link/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.click(sendButton)

      await waitFor(() => {
        expect(mockSendMagicLink).toHaveBeenCalledWith('test@example.com')
        expect(screen.getByText('Check Your Email! 📧')).toBeInTheDocument()
      })
    })

    it('should handle magic link error', async () => {
      mockSendMagicLink.mockResolvedValue({ error: 'Failed to send magic link' })
      
      render(<LoginPage />)
      
      const magicLinkButton = screen.getByRole('button', { name: /need a magic link/i })
      await userEvent.click(magicLinkButton)

      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const sendButton = screen.getByRole('button', { name: /send magic link/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to send magic link')).toBeInTheDocument()
      })
    })

    it('should allow going back from magic link mode', async () => {
      render(<LoginPage />)
      
      const magicLinkButton = screen.getByRole('button', { name: /need a magic link/i })
      await userEvent.click(magicLinkButton)

      const backButton = screen.getByRole('button', { name: /back to login options/i })
      await userEvent.click(backButton)

      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    })
  })

  describe('OAuth Authentication', () => {
    it('should handle Google OAuth', async () => {
      mockSignInWithOAuth.mockResolvedValue()
      
      render(<LoginPage />)
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      await userEvent.click(googleButton)

      expect(mockSignInWithOAuth).toHaveBeenCalledWith('google')
    })

    it('should handle Apple OAuth', async () => {
      mockSignInWithOAuth.mockResolvedValue()
      
      render(<LoginPage />)
      
      const appleButton = screen.getByRole('button', { name: /continue with apple/i })
      await userEvent.click(appleButton)

      expect(mockSignInWithOAuth).toHaveBeenCalledWith('apple')
    })

    it('should handle OAuth error', async () => {
      mockSignInWithOAuth.mockRejectedValue(new Error('OAuth failed'))
      
      render(<LoginPage />)
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      await userEvent.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText('google login failed. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling from URL Parameters', () => {
    it('should display link expired error', () => {
      mockSearchParamsGet.mockReturnValue('link_expired')
      
      render(<LoginPage />)
      
      expect(screen.getByText('The magic link has expired. Please request a new one.')).toBeInTheDocument()
    })

    it('should display auth failed error', () => {
      mockSearchParamsGet.mockReturnValue('auth_failed')
      
      render(<LoginPage />)
      
      expect(screen.getByText('Authentication failed. Please try again.')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<LoginPage />)
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      render(<LoginPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      expect(emailInput).toHaveAttribute('required')
      
      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('required')
    })

    it('should show error messages with proper roles', async () => {
      render(<LoginPage />)
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        const errorElement = screen.getByText('Email is required')
        expect(errorElement).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation', async () => {
      render(<LoginPage />)
      
      // Test tab order
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.tab()
      expect(emailInput).toHaveFocus()
      
      await userEvent.tab()
      expect(passwordInput).toHaveFocus()
      
      // Skip the eye toggle button
      await userEvent.tab()
      await userEvent.tab()
      expect(submitButton).toHaveFocus()
    })
  })

  describe('Security Features', () => {
    it('should not expose passwords in form data', async () => {
      render(<LoginPage />)
      
      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should have secure form attributes', () => {
      render(<LoginPage />)
      
      const form = screen.getByRole('textbox', { name: /email address/i }).closest('form')
      expect(form).toBeInTheDocument()
    })

    it('should disable form during submission', async () => {
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<LoginPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(submitButton)

      expect(submitButton).toBeDisabled()
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
    })
  })
})