// Client-safe pricing configuration
export const PRICING_PLANS = {
  ANNUAL: {
    id: 'annual',
    name: 'Annual Plan',
    description: 'Best value - 2 months free',
    price: 4.99,
    interval: 'year',
    intervalCount: 1,
    trialDays: 14,
    totalPrice: 59.88,
    savings: 14.40, // 2 months saved
  },
  MONTHLY: {
    id: 'monthly',
    name: 'Monthly Plan',
    description: 'Flexible billing',
    price: 5.99,
    interval: 'month',
    intervalCount: 1,
    trialDays: 7,
    totalPrice: 5.99,
    savings: 0,
  },
} as const

export type PricingPlan = typeof PRICING_PLANS[keyof typeof PRICING_PLANS]