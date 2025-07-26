/**
 * Analytics tracking for ChefsCart growth experiments
 * Provides event tracking with A/B test variant attribution
 */

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: number;
}

export interface ABTestVariant {
  experimentId: string;
  variantId: string;
  variantName: string;
}

class Analytics {
  private static instance: Analytics;
  private abTestAssignments: Map<string, ABTestVariant> = new Map();

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  /**
   * Assign user to A/B test variant
   */
  assignVariant(experimentId: string, userId: string, variants: { id: string; name: string; weight: number }[]): ABTestVariant {
    const key = `${experimentId}_${userId}`;
    
    // Check if already assigned
    if (this.abTestAssignments.has(key)) {
      return this.abTestAssignments.get(key)!;
    }

    // Deterministic assignment based on userId hash
    const hash = this.hashString(userId + experimentId);
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const threshold = (hash % 100) / 100 * totalWeight;
    
    let cumulativeWeight = 0;
    let selectedVariant = variants[0]; // fallback
    
    for (const variant of variants) {
      cumulativeWeight += variant.weight;
      if (threshold <= cumulativeWeight) {
        selectedVariant = variant;
        break;
      }
    }

    // Ensure we have a valid variant (this should always be true given the fallback)
    if (!selectedVariant) {
      selectedVariant = variants[0];
    }

    const assignment: ABTestVariant = {
      experimentId,
      variantId: selectedVariant!.id,
      variantName: selectedVariant!.name
    };

    this.abTestAssignments.set(key, assignment);
    
    // Track assignment event
    this.track('experiment_assigned', {
      experiment_id: experimentId,
      variant_id: selectedVariant!.id,
      variant_name: selectedVariant!.name
    }, userId);

    return assignment;
  }

  /**
   * Get current variant assignment for experiment
   */
  getVariant(experimentId: string, userId: string): ABTestVariant | null {
    const key = `${experimentId}_${userId}`;
    return this.abTestAssignments.get(key) || null;
  }

  /**
   * Track analytics event with A/B test context
   */
  track(event: string, properties: Record<string, any> = {}, userId?: string): void {
    const timestamp = Date.now();
    
    // Add A/B test context to all events
    const enrichedProperties = {
      ...properties,
      timestamp,
      user_id: userId,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof window !== 'undefined' ? document.referrer : undefined,
    };

    // Add active experiment variants
    if (userId) {
      const activeVariants: Record<string, any> = {};
      this.abTestAssignments.forEach((variant, key) => {
        if (key.endsWith(`_${userId}`)) {
          activeVariants[`${variant.experimentId}_variant`] = variant.variantId;
          activeVariants[`${variant.experimentId}_variant_name`] = variant.variantName;
        }
      });
      Object.assign(enrichedProperties, activeVariants);
    }

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: enrichedProperties,
      userId,
      timestamp
    };

    // In production, send to your analytics provider (PostHog, Mixpanel, etc.)
    if (typeof window !== 'undefined') {
      console.log('Analytics Event:', analyticsEvent);
      
      // Send to analytics service (uncomment when ready)
      // this.sendToAnalyticsProvider(analyticsEvent);
    }
  }

  /**
   * Track ZIP code completion with conversion attribution
   */
  trackZipCompletion(zipCode: string, isValid: boolean, userId: string): void {
    this.track('zip_completed', {
      zip_code: zipCode,
      is_valid: isValid,
      conversion_step: 'zip_entry',
      funnel_stage: 'acquisition'
    }, userId);
  }

  /**
   * Track button clicks with experiment context
   */
  trackButtonClick(buttonId: string, buttonText: string, userId: string): void {
    this.track('button_clicked', {
      button_id: buttonId,
      button_text: buttonText,
      interaction_type: 'click'
    }, userId);
  }

  /**
   * Track page views with experiment context
   */
  trackPageView(page: string, userId?: string): void {
    this.track('page_viewed', {
      page,
      page_type: 'landing'
    }, userId);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private async sendToAnalyticsProvider(event: AnalyticsEvent): Promise<void> {
    try {
      // Example implementation for PostHog or similar
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }
}

export const analytics = Analytics.getInstance();
export default analytics;