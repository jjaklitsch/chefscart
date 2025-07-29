import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Check if we're in build mode - more robust detection
const isBuildTime = process.env.VERCEL_ENV === 'preview' || 
                   process.env.NEXT_PHASE === 'phase-production-build' ||
                   process.env.NODE_ENV === 'production' && 
                   !process.env.FIREBASE_PROJECT_ID

let app: App | null = null

function initFirebaseAdmin(): App {
  // Return existing app if already initialized
  if (getApps().length > 0) {
    return getApps()[0]!
  }

  // During build time, create a mock app that won't actually connect
  if (isBuildTime) {
    return initializeApp({
      projectId: 'build-placeholder',
    })
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing required Firebase environment variables')
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  })
}

// Lazy initialization - only initialize when actually used
function getAdminApp(): App {
  if (!app) {
    app = initFirebaseAdmin()
  }
  return app
}

// Mock functions for build time
const mockAuth = {
  verifyIdToken: () => Promise.reject(new Error('Firebase not available during build')),
  createUser: () => Promise.reject(new Error('Firebase not available during build')),
  updateUser: () => Promise.reject(new Error('Firebase not available during build')),
  deleteUser: () => Promise.reject(new Error('Firebase not available during build')),
} as any

const mockDb = {
  collection: () => ({
    add: () => Promise.reject(new Error('Firebase not available during build')),
    doc: () => ({
      get: () => Promise.reject(new Error('Firebase not available during build')),
      set: () => Promise.reject(new Error('Firebase not available during build')),
      update: () => Promise.reject(new Error('Firebase not available during build')),
      delete: () => Promise.reject(new Error('Firebase not available during build')),
    }),
    where: () => ({
      limit: () => ({
        get: () => Promise.reject(new Error('Firebase not available during build')),
      }),
    }),
  }),
} as any

// Cached instances
let _adminAuth: any = null
let _adminDb: any = null
let _adminApp: App | null = null

// Export functions that return services (truly lazy)
export function getAdminAuth() {
  if (isBuildTime) return mockAuth
  if (!_adminAuth) {
    _adminAuth = getAuth(getAdminApp())
  }
  return _adminAuth
}

export function getAdminDb() {
  if (isBuildTime) return mockDb
  if (!_adminDb) {
    _adminDb = getFirestore(getAdminApp())
  }
  return _adminDb
}

export function getAdminAppInstance() {
  if (isBuildTime) return null
  if (!_adminApp) {
    _adminApp = getAdminApp()
  }
  return _adminApp
}

// Legacy exports for backward compatibility (but now they're functions)
export const adminAuth = getAdminAuth
export const adminDb = getAdminDb
export const adminApp = getAdminAppInstance