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
  // Temporarily disable A/B testing to fix server-side rendering issues
  // TODO: Re-enable once SSR issues are resolved
  
  return (
    <div className={className}>
      <p className="text-xl text-text-primary max-w-2xl mx-auto mb-4">
        Your AI sous-chef that turns personal meal plans into a ready-to-checkout Instacart cart in ≤ 5 min.
      </p>
      <p className="text-lg text-text-secondary max-w-xl mx-auto">
        Stop spending hours planning meals and shopping. Get personalized recipes and a complete grocery cart in minutes.
      </p>
    </div>
  );
}

export { HEADLINE_EXPERIMENT_CONFIG, HEADLINE_VARIANTS };