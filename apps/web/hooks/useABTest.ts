/**
 * React hook for A/B testing with analytics integration
 */

import { useState, useEffect } from 'react';
import analytics, { ABTestVariant } from '../lib/analytics';

export interface ABTestConfig {
  experimentId: string;
  variants: Array<{
    id: string;
    name: string;
    weight: number;
  }>;
}

export function useABTest(config: ABTestConfig) {
  const [variant, setVariant] = useState<ABTestVariant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeTest = () => {
      // Generate user ID from session/local storage or create new one
      let userId = '';
      if (typeof window !== 'undefined') {
        userId = localStorage.getItem('chefscart_user_id') || '';
        if (!userId) {
          userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('chefscart_user_id', userId);
        }
      }

      const assignedVariant = analytics.assignVariant(
        config.experimentId,
        userId,
        config.variants
      );

      setVariant(assignedVariant);
      setIsLoading(false);
    };

    initializeTest();
  }, [config.experimentId]);

  return {
    variant,
    isLoading,
    isVariant: (variantId: string) => variant?.variantId === variantId,
  };
}

export default useABTest;