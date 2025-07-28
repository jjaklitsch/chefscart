import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Check if we're in build mode
const isBuildTime = process.env.NODE_ENV === 'production' && 
                   process.env.FIREBASE_PROJECT_ID === 'placeholder-project-id'

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

// Export with simple direct approach to avoid property redefinition issues
let _adminAuth: any = null
let _adminDb: any = null
let _adminApp: App | null = null

export const adminAuth = isBuildTime ? mockAuth : (() => {
  if (!_adminAuth) {
    _adminAuth = getAuth(getAdminApp())
  }
  return _adminAuth
})()

export const adminDb = isBuildTime ? mockDb : (() => {
  if (!_adminDb) {
    _adminDb = getFirestore(getAdminApp())
  }
  return _adminDb
})()

export const adminApp = isBuildTime ? null : (() => {
  if (!_adminApp) {
    _adminApp = getAdminApp()
  }
  return _adminApp
})()