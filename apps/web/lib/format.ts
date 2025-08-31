/**
 * Format utilities for consistent display across the app
 */

/**
 * Format a USD amount to always show 2 decimal places
 * @param amount - The amount as a number
 * @returns Formatted string like "$14.40" or "$5.00"
 */
export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/**
 * Format a price range to show consistent decimal places
 * @param min - Minimum price
 * @param max - Maximum price  
 * @returns Formatted string like "$9.00 - $34.50"
 */
export function formatPriceRange(min: number, max: number): string {
  return `${formatUSD(min)} - ${formatUSD(max)}`
}