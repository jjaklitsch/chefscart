import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

let app: App

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  
  // Check if we're in build mode with placeholder values
  const isPlaceholder = projectId === 'placeholder-project-id' || 
                       clientEmail === 'placeholder@firebase.iam.gserviceaccount.com' ||
                       privateKey?.includes('placeholder-key')
  
  // During build time with placeholders, create a minimal app without credentials
  if (isPlaceholder) {
    app = initializeApp({
      projectId: 'build-placeholder',
    })
  } else if (!projectId || !clientEmail || !privateKey) {
    // Only throw error if we're not in build mode with placeholders
    throw new Error('Missing required Firebase environment variables')
  } else {
    // Normal initialization with real credentials
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    })
  }
} else {
  app = getApps()[0]!
}

export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)
export { app as adminApp }