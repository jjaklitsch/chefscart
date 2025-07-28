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
  
  if (!projectId || !clientEmail || !privateKey || isPlaceholder) {
    // During build time, create a minimal app without credentials
    if (process.env.NODE_ENV === 'production' && isPlaceholder) {
      // This is a build-time placeholder - create mock app
      app = initializeApp({
        projectId: 'build-placeholder',
      })
    } else {
      throw new Error('Missing required Firebase environment variables')
    }
  } else {
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