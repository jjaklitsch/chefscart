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