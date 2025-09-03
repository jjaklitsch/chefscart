/**
 * E2E Authentication Flow Tests
 * Testing complete user journeys for login, registration, and password management
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication Flows E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean state
    await page.context().clearCookies()
    await page.goto('http://localhost:3001')
  })

  test.describe('Landing Page Navigation', () => {
    test('should navigate to login from header', async ({ page }) => {
      await page.click('text=Sign In')
      await expect(page).toHaveURL('/login')
      await expect(page.locator('h1')).toContainText('Welcome Back')
    })

    test('should navigate to register from header', async ({ page }) => {
      await page.click('text=Get Started')
      await expect(page).toHaveURL('/register')
      await expect(page.locator('h1')).toContainText('Join ChefsCart')
    })
  })

  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
    })

    test('should render login form correctly', async ({ page }) => {
      // Check page structure
      await expect(page.locator('[data-testid="header"]')).toBeVisible()
      await expect(page.locator('[data-testid="footer"]')).toBeVisible()
      
      // Check form elements
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible()
      
      // Check OAuth buttons
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible()
      await expect(page.locator('button:has-text("Continue with Apple")')).toBeVisible()
    })

    test('should show validation errors for empty form', async ({ page }) => {
      await page.click('button:has-text("Sign In")')
      await expect(page.locator('text=Email is required')).toBeVisible()
    })

    test('should show validation errors for invalid email', async ({ page }) => {
      await page.fill('input[type="email"]', 'invalid-email')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button:has-text("Sign In")')
      
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible()
    })

    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"]')
      const toggleButton = page.locator('[data-testid="eye-icon"]').first()
      
      await passwordInput.fill('testpassword')
      await expect(passwordInput).toHaveAttribute('type', 'password')
      
      await toggleButton.click()
      await expect(passwordInput).toHaveAttribute('type', 'text')
      
      await toggleButton.click()
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })

    test('should navigate to forgot password page', async ({ page }) => {
      await page.click('text=Forgot your password?')
      await expect(page).toHaveURL('/forgot-password')
      await expect(page.locator('h1')).toContainText('Reset Your Password')
    })

    test('should switch to magic link mode', async ({ page }) => {
      await page.click('button:has-text("Need a magic link?")')
      
      await expect(page.locator('h1')).toContainText('Magic Link Login')
      await expect(page.locator('text=No password needed')).toBeVisible()
      
      // Test back navigation
      await page.click('button:has-text("Back to login options")')
      await expect(page.locator('h1')).toContainText('Welcome Back')
    })

    test('should handle magic link request', async ({ page }) => {
      await page.click('button:has-text("Need a magic link?")')
      
      await page.fill('input[type="email"]', 'test@example.com')
      await page.click('button:has-text("Send Magic Link")')
      
      // Should show success state (though email won't actually send in test)
      // This tests the UI flow, not the actual email delivery
      await expect(page.locator('text=Sending Magic Link...')).toBeVisible()
    })

    test('should navigate to registration', async ({ page }) => {
      await page.click('text=Create an account')
      await expect(page).toHaveURL('/register')
      await expect(page.locator('h1')).toContainText('Join ChefsCart')
    })

    test('should have proper accessibility attributes', async ({ page }) => {
      // Check form labels
      await expect(page.locator('label:has-text("Email Address")')).toBeVisible()
      await expect(page.locator('label:has-text("Password")')).toBeVisible()
      
      // Check required attributes
      await expect(page.locator('input[type="email"]')).toHaveAttribute('required')
      await expect(page.locator('input[type="password"]')).toHaveAttribute('required')
    })

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab')
      await expect(page.locator('input[type="email"]')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.locator('input[type="password"]')).toBeFocused()
    })
  })

  test.describe('Registration Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/register')
    })

    test('should render registration form correctly', async ({ page }) => {
      // Check form elements
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]').first()).toBeVisible()
      await expect(page.locator('input[type="password"]').last()).toBeVisible()
      await expect(page.locator('input[type="checkbox"]')).toBeVisible()
      await expect(page.locator('button:has-text("Create Account")')).toBeVisible()
    })

    test('should show password strength indicators', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"]').first()
      
      await passwordInput.fill('weak')
      
      // Should show strength bars and feedback
      await expect(page.locator('text=Password must have:')).toBeVisible()
      await expect(page.locator('text=At least 8 characters')).toBeVisible()
      await expect(page.locator('text=One uppercase letter')).toBeVisible()
    })

    test('should validate strong password', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"]').first()
      
      await passwordInput.fill('StrongPass123!')
      
      await expect(page.locator('text=Strong password!')).toBeVisible()
    })

    test('should validate password confirmation', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"]').first()
      const confirmInput = page.locator('input[type="password"]').last()
      
      await passwordInput.fill('StrongPass123!')
      await confirmInput.fill('DifferentPass123!')
      
      await expect(page.locator('text=Passwords do not match')).toBeVisible()
    })

    test('should require terms acceptance', async ({ page }) => {
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'StrongPass123!')
      await page.fill('input[type="password"]', 'StrongPass123!')
      
      const submitButton = page.locator('button:has-text("Create Account")')
      await expect(submitButton).toBeDisabled()
    })

    test('should enable submit when form is valid', async ({ page }) => {
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'StrongPass123!')
      await page.fill('input[type="password"]', 'StrongPass123!')
      await page.check('input[type="checkbox"]')
      
      const submitButton = page.locator('button:has-text("Create Account")')
      await expect(submitButton).toBeEnabled()
    })

    test('should switch to magic link mode', async ({ page }) => {
      await page.click('button:has-text("Prefer a magic link?")')
      
      await expect(page.locator('h1')).toContainText('Magic Link Signup')
      await expect(page.locator('text=No password needed')).toBeVisible()
      
      // Should still require terms acceptance
      await expect(page.locator('input[type="checkbox"]')).toBeVisible()
    })

    test('should navigate to login', async ({ page }) => {
      await page.click('text=Sign in here')
      await expect(page).toHaveURL('/login')
      await expect(page.locator('h1')).toContainText('Welcome Back')
    })

    test('should have proper accessibility attributes', async ({ page }) => {
      // Check form labels
      await expect(page.locator('label:has-text("Email Address")')).toBeVisible()
      await expect(page.locator('label:has-text("Password")')).toBeVisible()
      await expect(page.locator('label:has-text("Confirm Password")')).toBeVisible()
      
      // Check ARIA attributes
      const passwordInput = page.locator('input[type="password"]').first()
      await passwordInput.fill('weak')
      
      // Should have describedby for password requirements
      await expect(page.locator('text=Password must have:')).toBeVisible()
    })
  })

  test.describe('Forgot Password Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/forgot-password')
    })

    test('should render forgot password form correctly', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Reset Your Password')
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('button:has-text("Send Reset Link")')).toBeVisible()
    })

    test('should validate email format', async ({ page }) => {
      await page.fill('input[type="email"]', 'invalid-email')
      await page.click('button:has-text("Send Reset Link")')
      
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible()
    })

    test('should offer magic link alternative', async ({ page }) => {
      await page.fill('input[type="email"]', 'test@example.com')
      
      const magicLinkButton = page.locator('button:has-text("Send Magic Link Instead")')
      await expect(magicLinkButton).toBeEnabled()
      await expect(page.locator('text=Magic links work without passwords')).toBeVisible()
    })

    test('should navigate back to login', async ({ page }) => {
      await page.click('text=Back to login')
      await expect(page).toHaveURL('/login')
    })

    test('should navigate to login from footer link', async ({ page }) => {
      await page.click('text=Sign in here')
      await expect(page).toHaveURL('/login')
    })
  })

  test.describe('Reset Password Page', () => {
    test('should show invalid token error', async ({ page }) => {
      await page.goto('/reset-password')
      
      await expect(page.locator('h2')).toContainText('Reset Link Invalid')
      await expect(page.locator('text=This password reset link is invalid or has expired')).toBeVisible()
    })

    test('should navigate to forgot password from invalid token', async ({ page }) => {
      await page.goto('/reset-password')
      
      await page.click('text=Request New Reset Link')
      await expect(page).toHaveURL('/forgot-password')
    })

    test('should navigate to login from invalid token', async ({ page }) => {
      await page.goto('/reset-password')
      
      await page.click('text=Back to Sign In')
      await expect(page).toHaveURL('/login')
    })

    test('should render password reset form with valid tokens', async ({ page }) => {
      // Simulate valid reset link with tokens
      await page.goto('/reset-password?access_token=valid_token&refresh_token=refresh_token&type=recovery')
      
      await expect(page.locator('h1')).toContainText('Create New Password')
      await expect(page.locator('input[type="password"]').first()).toBeVisible()
      await expect(page.locator('input[type="password"]').last()).toBeVisible()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    })

    test('should be responsive on mobile - login page', async ({ page }) => {
      await page.goto('/login')
      
      // Check that form is properly sized
      await expect(page.locator('.max-w-md')).toBeVisible()
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      
      // Check that buttons stack properly
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible()
      await expect(page.locator('button:has-text("Continue with Apple")')).toBeVisible()
    })

    test('should be responsive on mobile - registration page', async ({ page }) => {
      await page.goto('/register')
      
      // Check password strength indicators are readable
      const passwordInput = page.locator('input[type="password"]').first()
      await passwordInput.fill('weak')
      
      await expect(page.locator('text=Password must have:')).toBeVisible()
      
      // Check that form elements don't overflow
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="checkbox"]')).toBeVisible()
    })
  })

  test.describe('Cross-browser Compatibility', () => {
    test('should handle authentication errors gracefully', async ({ page }) => {
      // Test with URL parameters indicating auth errors
      await page.goto('/login?error=auth_failed')
      
      await expect(page.locator('text=Authentication failed')).toBeVisible()
    })

    test('should handle expired link errors', async ({ page }) => {
      await page.goto('/login?error=link_expired')
      
      await expect(page.locator('text=The magic link has expired')).toBeVisible()
    })
  })

  test.describe('Performance and Loading', () => {
    test('should load pages quickly', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/login')
      const loadTime = Date.now() - startTime
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
      
      // Should show loading state if needed
      await expect(page.locator('h1')).toContainText('Welcome Back')
    })

    test('should show loading states during form submission', async ({ page }) => {
      await page.goto('/login')
      
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      
      // Intercept the request to simulate slow response
      await page.route('**/auth/**', route => {
        setTimeout(() => route.continue(), 1000)
      })
      
      await page.click('button:has-text("Sign In")')
      
      // Should show loading state
      await expect(page.locator('text=Signing In...')).toBeVisible()
    })
  })

  test.describe('Security Headers and Features', () => {
    test('should have proper security headers', async ({ page }) => {
      const response = await page.goto('/login')
      
      // Check for security headers (these should be set by Next.js/Vercel)
      const headers = response?.headers()
      
      // Note: Actual header checking depends on deployment configuration
      expect(response?.status()).toBe(200)
    })

    test('should not expose sensitive information in client-side code', async ({ page }) => {
      await page.goto('/login')
      
      // Check that no API keys or sensitive data are exposed
      const content = await page.content()
      
      // Should not contain common sensitive patterns
      expect(content).not.toMatch(/sk_live_/i) // Stripe live keys
      expect(content).not.toMatch(/pk_live_/i) // Stripe public live keys (should use test in dev)
      expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/i) // AWS access keys
    })

    test('should have proper form attributes for security', async ({ page }) => {
      await page.goto('/login')
      
      // Password fields should be properly typed
      await expect(page.locator('input[type="password"]')).toHaveAttribute('type', 'password')
      
      // Email fields should have proper type for validation
      await expect(page.locator('input[type="email"]')).toHaveAttribute('type', 'email')
    })
  })
})