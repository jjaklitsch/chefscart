import Stripe from 'stripe'

// Server-side Stripe instance (only available on server)
export const getStripe = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Server-side Stripe instance cannot be used on client')
  }
  
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-08-27.basil',
    typescript: true,
  })
}

// Server-only price IDs
export const STRIPE_PRICE_IDS = {
  ANNUAL: process.env.STRIPE_ANNUAL_PRICE_ID!,
  MONTHLY: process.env.STRIPE_MONTHLY_PRICE_ID!,
} as const