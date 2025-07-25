import { initializeApp } from 'firebase-admin/app'
import { onRequest } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import cors from 'cors'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Firebase Admin
initializeApp()

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: 'us-central1',
})

const corsHandler = cors({ origin: true })

// Import individual function modules
import { generateMealPlan } from './gptPlan'
import { createInstacartList } from './createList'
import { sendConfirmationEmail } from './emailSend'

// Export the functions
export const gptPlan = onRequest(
  {
    timeoutSeconds: 30,
    memory: '1GiB',
  },
  (req, res) => corsHandler(req, res, () => generateMealPlan(req, res))
)

export const createList = onRequest(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  (req, res) => corsHandler(req, res, () => createInstacartList(req, res))
)

export const emailSend = onRequest(
  {
    timeoutSeconds: 10,
    memory: '256MiB',
  },
  (req, res) => corsHandler(req, res, () => sendConfirmationEmail(req, res))
)