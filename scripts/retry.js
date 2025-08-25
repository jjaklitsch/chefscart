// retry.js - Exponential backoff retry utility

/**
 * Retry function with exponential backoff and jitter
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry configuration
 * @param {number} options.tries - Maximum number of attempts (default: 5)
 * @param {number} options.base - Base delay in milliseconds (default: 300)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 30000)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried
 * @returns {Promise} Result of successful function call
 */
async function withBackoff(fn, options = {}) {
  const { 
    tries = 5, 
    base = 300, 
    maxDelay = 30000,
    shouldRetry = (error) => {
      // Retry on network errors, rate limits, and server errors
      if (error.status >= 500) return true; // Server errors
      if (error.status === 429) return true; // Rate limit
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') return true; // Network
      return false;
    }
  } = options;

  let attempt = 0;
  let lastError;

  while (attempt < tries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt++;

      // Don't retry if we've exhausted attempts or error shouldn't be retried
      if (attempt >= tries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = base * (2 ** (attempt - 1));
      const jitter = Math.random() * 100; // 0-100ms jitter
      const delay = Math.min(maxDelay, exponentialDelay + jitter);

      console.log(`⏳ Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

module.exports = { withBackoff };