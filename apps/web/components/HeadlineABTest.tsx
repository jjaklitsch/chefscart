/**
 * A/B Test Component for Value Proposition Headlines
 * Tests acquisition-focused messaging to improve ZIP completion rates
 */

import { useABTest } from '../hooks/useABTest';

const HEADLINE_EXPERIMENT_CONFIG = {
  experimentId: 'headline_value_prop_v1',
  variants: [
    {
      id: 'control',
      name: 'Control: Current AI Sous-chef',
      weight: 50
    },
    {
      id: 'speed_focused',
      name: 'Speed-focused: Meal Plan to Cart',
      weight: 25
    },
    {
      id: 'problem_solution',
      name: 'Problem/Solution: Never Plan Again',
      weight: 25
    }
  ]
};

const HEADLINE_VARIANTS = {
  control: {
    h1: "Your AI sous-chef that turns personal meal plans into a ready-to-checkout Instacart cart in ≤ 5 min.",
    subtext: "Stop spending hours planning meals and shopping. Get personalized recipes and a complete grocery cart in minutes."
  },
  speed_focused: {
    h1: "From meal plan to Instacart cart in under 5 minutes.",
    subtext: "Skip the meal planning headache. Our AI creates personalized recipes and builds your complete grocery cart instantly."
  },
  problem_solution: {
    h1: "Never plan meals again. Your AI chef handles everything.",
    subtext: "End decision fatigue around dinner. Get personalized meal plans and ready-to-order Instacart carts delivered weekly."
  }
};

interface HeadlineABTestProps {
  className?: string;
}

export default function HeadlineABTest({ className = "" }: HeadlineABTestProps) {
  const { variant, isLoading } = useABTest(HEADLINE_EXPERIMENT_CONFIG);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="animate-pulse">
          <div className="h-8 bg-brand-100 rounded mb-4"></div>
          <div className="h-4 bg-brand-100 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const variantId = variant?.variantId || 'control';
  const content = HEADLINE_VARIANTS[variantId as keyof typeof HEADLINE_VARIANTS];

  return (
    <div className={className}>
      <p className="text-xl text-text-primary max-w-2xl mx-auto mb-4">
        {content.h1}
      </p>
      <p className="text-lg text-text-secondary max-w-xl mx-auto">
        {content.subtext}
      </p>
    </div>
  );
}

export { HEADLINE_EXPERIMENT_CONFIG, HEADLINE_VARIANTS };