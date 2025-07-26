import { vi } from 'vitest'

// Mock environment variables
vi.mock('process', () => ({
  env: {
    RESEND_API_KEY: 'test-key',
    RESEND_FROM_EMAIL: 'test@chefscart.ai',
    USPS_API_KEY: 'test-usps-key',
    IPAPI_KEY: 'test-ipapi-key',
  },
}))

// Mock fetch globally
global.fetch = vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}