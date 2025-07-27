import type { FlowResult, ZipValidationResult } from './types';

export async function validateZipCode(zipCode: string): Promise<FlowResult<ZipValidationResult>> {
  try {
    // Mock validation - in production this would check against Instacart coverage
    const isValid = /^\d{5}(-\d{4})?$/.test(zipCode);
    
    if (!isValid) {
      return {
        success: false,
        error: 'Invalid ZIP code format'
      };
    }
    
    // Mock data - all ZIP codes are "supported" in development
    const result: ZipValidationResult = {
      supported: true,
      zipCode,
      city: 'Mock City',
      state: 'MC',
      instacartAvailable: true
    };
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    };
  }
}