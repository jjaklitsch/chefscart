/**
 * Feature flag utilities for toggling functionality
 * Uses environment variables for secure server-side control
 */

/**
 * Check if the payment system is enabled
 * @returns boolean - true if payments are enabled, false for free mode
 */
export function isPaymentSystemEnabled(): boolean {
  return process.env.ENABLE_PAYMENT_SYSTEM === 'true'
}

/**
 * Check if the shopping cart feature is enabled
 * @returns boolean - true if shopping cart is enabled, false for Amazon affiliate fallback
 */
export function isShoppingCartEnabled(): boolean {
  return process.env.ENABLE_SHOPPING_CART === 'true'
}

/**
 * Generate Amazon affiliate URL for a search query or product
 * @param query - search term or keywords for Amazon
 * @param asin - optional ASIN for direct product links
 * @returns string - Amazon affiliate URL with chefscart-20 tag
 */
export function generateAmazonAffiliateUrl(query?: string, asin?: string): string {
  const affiliateTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || 'chefscart-20'
  
  if (asin) {
    // Direct product link
    return `https://www.amazon.com/dp/${asin}?tag=${affiliateTag}&linkCode=osi&th=1&psc=1`
  } else if (query) {
    // Search link
    return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${affiliateTag}&linkCode=osi`
  } else {
    // General Amazon home page
    return `https://www.amazon.com/?tag=${affiliateTag}&linkCode=osi`
  }
}

/**
 * Check if a user should have access to premium features
 * In free mode, all authenticated users get access
 * In paid mode, only users with active subscriptions get access
 * 
 * @param isAuthenticated - whether the user is logged in
 * @param hasActiveSubscription - whether the user has an active subscription
 * @returns boolean - true if user should have access
 */
export function hasFeatureAccess(isAuthenticated: boolean, hasActiveSubscription: boolean = false): boolean {
  // If payments are disabled, all authenticated users get access
  if (!isPaymentSystemEnabled()) {
    return isAuthenticated
  }
  
  // If payments are enabled, require active subscription
  return isAuthenticated && hasActiveSubscription
}

/**
 * Get feature access for anonymous users (onboarding)
 * In both free and paid mode, anonymous users can access onboarding
 * 
 * @returns boolean - true if anonymous users can access features
 */
export function hasAnonymousAccess(): boolean {
  // Anonymous access is always allowed for onboarding in both modes
  return true
}