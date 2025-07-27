import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    isReady: true
  })
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: '/',
    searchParams: new URLSearchParams()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}))

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
    signInAnonymously: vi.fn(),
    signOut: vi.fn()
  },
  db: {
    collection: vi.fn(),
    doc: vi.fn()
  }
}))

// Mock Firebase Admin
vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn()
  },
  adminDb: {
    collection: vi.fn(),
    doc: vi.fn()
  }
}))

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                meals: [],
                totalEstimatedCost: 0,
                preferences: {}
              })
            }
          }]
        })
      }
    }
  }))
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_FIREBASE_CONFIG = JSON.stringify({
  apiKey: 'test-api-key',
  authDomain: 'test.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test.appspot.com',
  messagingSenderId: '123456789',
  appId: 'test-app-id'
})

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock performance APIs for testing
global.performance = {
  ...global.performance,
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(),
  getEntriesByName: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  now: vi.fn(() => Date.now())
}

// Mock Web APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Clean up after each test
beforeEach(() => {
  vi.clearAllMocks()
  
  // Reset performance marks
  if (global.performance?.clearMarks) {
    global.performance.clearMarks()
  }
  if (global.performance?.clearMeasures) {
    global.performance.clearMeasures()
  }
})

// Global test helpers
export const mockLCPMetric = (value: number) => {
  const mockEntry = {
    name: 'LCP',
    startTime: value,
    duration: 0,
    entryType: 'largest-contentful-paint',
    element: document.createElement('div')
  }
  
  vi.mocked(global.performance.getEntriesByType).mockImplementation((type: string) => {
    if (type === 'largest-contentful-paint') {
      return [mockEntry]
    }
    return []
  })
  
  return mockEntry
}

export const createMockResponse = (data: any, ok = true, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: {
      'Content-Type': 'application/json'
    }
  })
}