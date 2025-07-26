import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

let app: App

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing required Firebase environment variables')
  }
  
  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  })
} else {
  app = getApps()[0]!
}

export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)
export { app as adminApp }