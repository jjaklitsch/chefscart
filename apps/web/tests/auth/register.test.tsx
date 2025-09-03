/**
 * Comprehensive Registration Page Tests
 * Testing user registration flows, password validation, error handling, and security
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import RegisterPage from '../../src/app/register/page'
import { useAuth } from '../../contexts/AuthContext'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

vi.mock('../../contexts/AuthContext')

// Mock icons
vi.mock('lucide-react', () => ({
  ShoppingCart: () => <div data-testid="shopping-cart-icon">ShoppingCart</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  EyeOff: () => <div data-testid="eye-off-icon">EyeOff</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  X: () => <div data-testid="x-icon">X</div>
}))

// Mock components
vi.mock('../../components/Header', () => ({
  default: () => <header data-testid="header">Header</header>
}))

vi.mock('../../components/Footer', () => ({
  default: () => <footer data-testid="footer">Footer</footer>
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }) => <a href={href} {...props}>{children}</a>
}))

describe('Register Page', () => {
  const mockRouterPush = vi.fn()
  const mockRouterReplace = vi.fn()
  const mockSignUp = vi.fn()
  const mockSignInWithOAuth = vi.fn()
  const mockSendMagicLink = vi.fn()

  const mockAuthContext = {
    user: null,
    session: null,
    loading: false,
    signUp: mockSignUp,
    signIn: vi.fn(),
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
    
    useAuth.mockReturnValue(mockAuthContext)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering and UI', () => {
    it('should render all main components', () => {
      render(<RegisterPage />)
      
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      expect(screen.getByText('Join ChefsCart')).toBeInTheDocument()
      expect(screen.getByText('Create your account and start planning amazing meals')).toBeInTheDocument()
    })

    it('should render registration form elements', () => {
      render(<RegisterPage />)
      
      expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('should render terms and conditions checkbox', () => {
      render(<RegisterPage />)
      
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
      expect(screen.getByText(/i agree to the/i)).toBeInTheDocument()
    })

    it('should redirect authenticated users to dashboard', () => {
      useAuth.mockReturnValue({
        ...mockAuthContext,
        user: { id: '1', email: 'test@example.com' },
        loading: false
      })

      render(<RegisterPage />)
      
      expect(mockRouterReplace).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('Password Strength Validation', () => {
    it('should show password strength indicators', async () => {
      render(<RegisterPage />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      await userEvent.type(passwordInput, 'weak')

      // Should show strength bars
      const strengthBars = screen.getAllByRole('generic').filter(el => 
        el.className.includes('h-1') && el.className.includes('flex-1')
      )
      expect(strengthBars).toHaveLength(5)
    })

    it('should validate password requirements', async () => {
      render(<RegisterPage />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      await userEvent.type(passwordInput, 'weak')

      expect(screen.getByText('Password must have:')).toBeInTheDocument()
      expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
      expect(screen.getByText('One uppercase letter')).toBeInTheDocument()
      expect(screen.getByText('One number')).toBeInTheDocument()
      expect(screen.getByText('One special character (!@#$%^&*)')).toBeInTheDocument()
    })

    it('should show strong password indicator', async () => {
      render(<RegisterPage />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      await userEvent.type(passwordInput, 'StrongPass123!')

      await waitFor(() => {
        expect(screen.getByText('Strong password!')).toBeInTheDocument()
      })
    })

    it('should validate password confirmation match', async () => {
      render(<RegisterPage />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      
      await userEvent.type(passwordInput, 'StrongPass123!')
      await userEvent.type(confirmInput, 'DifferentPass123!')

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should validate email format', async () => {
      render(<RegisterPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(emailInput, 'invalid-email')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
      })
    })

    it('should require terms acceptance', async () => {
      render(<RegisterPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'StrongPass123!')
      await userEvent.type(confirmInput, 'StrongPass123!')
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Please accept the Terms of Service and Privacy Policy')).toBeInTheDocument()
      })
    })

    it('should disable submit button when form is invalid', async () => {
      render(<RegisterPage />)
      
      const submitButton = screen.getByRole('button', { name: /create account/i })
      expect(submitButton).toBeDisabled()

      const passwordInput = screen.getByLabelText(/^password$/i)
      await userEvent.type(passwordInput, 'weak')
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when form is valid', async () => {
      render(<RegisterPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByRole('checkbox')
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'StrongPass123!')
      await userEvent.type(confirmInput, 'StrongPass123!')
      await userEvent.click(termsCheckbox)

      await waitFor(() => {
        expect(submitButton).toBeEnabled()
      })
    })
  })

  describe('Registration Flow', () => {
    it('should handle successful registration', async () => {
      mockSignUp.mockResolvedValue({ data: { user: {} }, error: null })
      
      render(<RegisterPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByRole('checkbox')
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'StrongPass123!')
      await userEvent.type(confirmInput, 'StrongPass123!')
      await userEvent.click(termsCheckbox)
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'StrongPass123!', {
          email_confirm: true,
          data: {
            signup_method: 'email_password'
          }
        })
        expect(screen.getByText('Verify Your Email! 📧')).toBeInTheDocument()
      })
    })

    it('should handle registration error for existing user', async () => {
      mockSignUp.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' }
      })
      
      render(<RegisterPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByRole('checkbox')
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'StrongPass123!')
      await userEvent.type(confirmInput, 'StrongPass123!')
      await userEvent.click(termsCheckbox)
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/this email is already registered. try signing in instead/i)).toBeInTheDocument()
      })
    })

    it('should show loading state during registration', async () => {
      mockSignUp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<RegisterPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByRole('checkbox')
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'StrongPass123!')
      await userEvent.type(confirmInput, 'StrongPass123!')
      await userEvent.click(termsCheckbox)
      await userEvent.click(submitButton)

      expect(screen.getByText('Creating Account...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Magic Link Registration', () => {
    it('should switch to magic link mode', async () => {
      render(<RegisterPage />)
      
      const magicLinkButton = screen.getByRole('button', { name: /prefer a magic link/i })
      await userEvent.click(magicLinkButton)

      expect(screen.getByText('Magic Link Signup')).toBeInTheDocument()
      expect(screen.getByText('No password needed - we\'ll send you a secure link')).toBeInTheDocument()
    })

    it('should handle magic link registration', async () => {
      mockSendMagicLink.mockResolvedValue({ error: null })
      
      render(<RegisterPage />)
      
      const magicLinkButton = screen.getByRole('button', { name: /prefer a magic link/i })
      await userEvent.click(magicLinkButton)

      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const termsCheckbox = screen.getByRole('checkbox')
      const submitButton = screen.getByRole('button', { name: /create account with magic link/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.click(termsCheckbox)
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockSendMagicLink).toHaveBeenCalledWith('test@example.com')
        expect(screen.getByText('Verify Your Email! 📧')).toBeInTheDocument()
      })
    })
  })

  describe('OAuth Registration', () => {
    it('should handle Google OAuth registration', async () => {
      mockSignInWithOAuth.mockResolvedValue()
      
      render(<RegisterPage />)
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      await userEvent.click(googleButton)

      expect(mockSignInWithOAuth).toHaveBeenCalledWith('google')
    })

    it('should handle Apple OAuth registration', async () => {
      mockSignInWithOAuth.mockResolvedValue()
      
      render(<RegisterPage />)
      
      const appleButton = screen.getByRole('button', { name: /continue with apple/i })
      await userEvent.click(appleButton)

      expect(mockSignInWithOAuth).toHaveBeenCalledWith('apple')
    })

    it('should handle OAuth error', async () => {
      mockSignInWithOAuth.mockRejectedValue(new Error('OAuth failed'))
      
      render(<RegisterPage />)
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      await userEvent.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText('google registration failed. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Email Verification State', () => {
    it('should show email verification screen', async () => {
      mockSignUp.mockResolvedValue({ data: { user: {} }, error: null })
      
      render(<RegisterPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByRole('checkbox')
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'StrongPass123!')
      await userEvent.type(confirmInput, 'StrongPass123!')
      await userEvent.click(termsCheckbox)
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Verify Your Email! 📧')).toBeInTheDocument()
        expect(screen.getByText(/we've sent a verification link to test@example.com/i)).toBeInTheDocument()
      })
    })

    it('should allow trying different email from verification screen', async () => {
      mockSignUp.mockResolvedValue({ data: { user: {} }, error: null })
      
      render(<RegisterPage />)
      
      // Complete registration flow first
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByRole('checkbox')
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'StrongPass123!')
      await userEvent.type(confirmInput, 'StrongPass123!')
      await userEvent.click(termsCheckbox)
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Verify Your Email! 📧')).toBeInTheDocument()
      })

      // Click try different email
      const tryDifferentButton = screen.getByRole('button', { name: /try different email/i })
      await userEvent.click(tryDifferentButton)

      expect(screen.getByText('Join ChefsCart')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<RegisterPage />)
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      render(<RegisterPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      expect(emailInput).toHaveAttribute('required')
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      expect(passwordInput).toHaveAttribute('required')
      
      const confirmInput = screen.getByLabelText(/confirm password/i)
      expect(confirmInput).toHaveAttribute('required')
    })

    it('should support keyboard navigation', async () => {
      render(<RegisterPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      
      await userEvent.tab()
      expect(emailInput).toHaveFocus()
    })
  })

  describe('Security Features', () => {
    it('should not expose passwords in form data', async () => {
      render(<RegisterPage />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(confirmInput).toHaveAttribute('type', 'password')
    })

    it('should disable form during submission', async () => {
      mockSignUp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<RegisterPage />)
      
      const emailInput = screen.getByRole('textbox', { name: /email address/i })
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByRole('checkbox')
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'StrongPass123!')
      await userEvent.type(confirmInput, 'StrongPass123!')
      await userEvent.click(termsCheckbox)
      await userEvent.click(submitButton)

      expect(submitButton).toBeDisabled()
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(confirmInput).toBeDisabled()
    })

    it('should enforce strong password requirements', async () => {
      render(<RegisterPage />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(passwordInput, '12345678')
      expect(submitButton).toBeDisabled()

      await userEvent.clear(passwordInput)
      await userEvent.type(passwordInput, 'StrongPass123!')
      
      // Still disabled because other fields aren't filled
      expect(submitButton).toBeDisabled()
    })
  })
})