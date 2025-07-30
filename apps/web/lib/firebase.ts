import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getStorage, FirebaseStorage } from 'firebase/storage'

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Cached instances
let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _db: Firestore | null = null
let _storage: FirebaseStorage | null = null

function initializeFirebaseApp(): FirebaseApp {
  // Return existing app if already initialized
  if (getApps().length > 0) {
    return getApps()[0]!
  }

  // Only initialize in browser environment
  if (!isBrowser) {
    throw new Error('Firebase client SDK can only be used in browser environment')
  }

  // Validate required environment variables
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    throw new Error('Missing required Firebase environment variables')
  }

  const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  }

  return initializeApp(firebaseConfig)
}

// Lazy getters for Firebase services
export function getFirebaseAuth(): Auth {
  if (!_auth) {
    if (!_app) {
      _app = initializeFirebaseApp()
    }
    _auth = getAuth(_app)
  }
  return _auth
}

export function getFirebaseDb(): Firestore {
  if (!_db) {
    if (!_app) {
      _app = initializeFirebaseApp()
    }
    _db = getFirestore(_app)
  }
  return _db
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!_storage) {
    if (!_app) {
      _app = initializeFirebaseApp()
    }
    _storage = getStorage(_app)
  }
  return _storage
}

export function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = initializeFirebaseApp()
  }
  return _app
}

// Legacy exports for backward compatibility (now using lazy functions)
export const auth = getFirebaseAuth
export const db = getFirebaseDb
export const storage = getFirebaseStorage

// Default export
export default getFirebaseApp