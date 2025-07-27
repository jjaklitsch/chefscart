# ChefsCart Style Guide Implementation Plan

This document provides specific implementation steps, code changes, and Tailwind configuration updates to implement the new brand style guide inspired by HomeChef's design aesthetic.

## Quick Start Checklist

- [ ] Phase 1: Update color palette and CSS variables
- [ ] Phase 1: Add new fonts (Plus Jakarta Sans)
- [ ] Phase 1: Update Tailwind config with new colors
- [ ] Phase 2: Update core components (buttons, inputs, cards)
- [ ] Phase 2: Apply new styling to landing page
- [ ] Phase 3: Enhance chat interface styling
- [ ] Phase 3: Add advanced animations and effects

## Phase 1: Foundation Updates

### 1.1 Font Integration

Add Plus Jakarta Sans to the project:

**Update `apps/web/src/app/layout.tsx`:**

```tsx
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap'
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
```

### 1.2 CSS Variables Update

**Update `apps/web/src/app/globals.css`:**

```css
:root {
  /* Background System Variables */
  --background: #ffffff;
  --foreground: #1f2937;
  
  /* Primary Brand Colors - Enhanced */
  --brand-primary: #16a34a;
  --brand-primary-hover: #15803d;
  --brand-primary-light: #22c55e;
  --brand-primary-dark: #166534;
  
  /* Sage Green (New Secondary) */
  --sage-50: #f0fdf4;
  --sage-100: #dcfce7;
  --sage-200: #bbf7d0;
  --sage-300: #86efac;
  
  /* Warm Beige/Cream (New Complementary) */
  --cream-50: #fffef7;
  --cream-100: #fefce8;
  --cream-200: #fef08a;
  --warm-sand: #f5f1eb;
  
  /* Golden Yellow (New Accent) */
  --gold-400: #facc15;
  --gold-500: #eab308;
  --gold-600: #ca8a04;
  --gold-light: #fef3c7;
  
  /* Earthy Brown (New Supporting) */
  --earth-600: #92400e;
  --earth-700: #78350f;
  --earth-100: #fef7ed;
  
  /* Enhanced Neutral Grays */
  --neutral-0: #ffffff;
  --neutral-50: #fafafa;
  --neutral-100: #f3f4f6;
  --neutral-200: #e5e7eb;
  --neutral-300: #d1d5db;
  --neutral-400: #9ca3af;
  --neutral-500: #6b7280;
  --neutral-600: #4b5563;
  --neutral-700: #374151;
  --neutral-800: #1f2937;
  --neutral-900: #111827;
  
  /* Typography */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-display: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  
  /* Semantic Colors */
  --success: #10b981;
  --success-light: #d1fae5;
  --warning: #f59e0b;
  --warning-light: #fef3c7;
  --error: #ef4444;
  --error-light: #fee2e2;
  --info: #3b82f6;
  --info-light: #dbeafe;
  
  /* Enhanced Shadows */
  --shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-soft: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-medium: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-large: 0 20px 25px rgba(0, 0, 0, 0.15);
  --shadow-brand: 0 4px 12px rgba(22, 163, 74, 0.25);
  --shadow-brand-lg: 0 8px 25px rgba(22, 163, 74, 0.2);
  --shadow-gold: 0 4px 12px rgba(234, 179, 8, 0.25);
  --shadow-gold-lg: 0 6px 20px rgba(234, 179, 8, 0.35);
  
  /* Border Radius Scale */
  --radius-sm: 0.375rem;    /* 6px */
  --radius-md: 0.5rem;      /* 8px */
  --radius-lg: 0.75rem;     /* 12px */
  --radius-xl: 1rem;        /* 16px */
  --radius-2xl: 1.5rem;     /* 24px */
  
  /* Spacing Scale */
  --spacing-xs: 0.25rem;    /* 4px */
  --spacing-sm: 0.5rem;     /* 8px */
  --spacing-md: 1rem;       /* 16px */
  --spacing-lg: 1.5rem;     /* 24px */
  --spacing-xl: 2rem;       /* 32px */
  --spacing-2xl: 3rem;      /* 48px */
  --spacing-3xl: 4rem;      /* 64px */
  --spacing-4xl: 6rem;      /* 96px */
  
  /* Transitions */
  --transition-fast: 0.15s ease-out;
  --transition-normal: 0.25s ease-out;
  --transition-slow: 0.4s ease-out;
}

/* Typography System */
body {
  font-family: var(--font-primary);
  line-height: 1.6;
  color: var(--neutral-800);
}

.font-display {
  font-family: var(--font-display);
}

/* Enhanced Typography Classes */
.text-hero {
  font-size: 3.75rem; /* 60px */
  line-height: 1.1;
  font-weight: 700;
  font-family: var(--font-display);
}

.text-display {
  font-size: 3rem; /* 48px */
  line-height: 1.2;
  font-weight: 600;
  font-family: var(--font-display);
}

@media (max-width: 768px) {
  .text-hero {
    font-size: 2.5rem; /* 40px */
  }
  
  .text-display {
    font-size: 2rem; /* 32px */
  }
}
```

### 1.3 Tailwind Config Update

**Update `apps/web/tailwind.config.ts`:**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // System colors
        background: "var(--background)",
        foreground: "var(--foreground)",
        
        // Primary Brand Green
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',   // Primary
          700: '#15803d',   // Hover
          800: '#166534',   // Dark
          900: '#14532d',   // Darkest
        },
        
        // Sage Green (Secondary)
        sage: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        
        // Warm Beige/Cream
        cream: {
          50: '#fffef7',
          100: '#fefce8',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        
        // Golden Yellow (Accent)
        gold: {
          50: '#fefce8',
          100: '#fef3c7',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',  // Primary accent
          500: '#eab308',  // Medium
          600: '#ca8a04',  // Dark
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        
        // Earthy Brown
        earth: {
          50: '#fefce8',
          100: '#fef7ed',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#92400e',  // Primary earth
          700: '#78350f',  // Dark earth
          800: '#431407',
          900: '#1c0701',
        },
        
        // Enhanced Neutrals
        neutral: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        
        // Semantic Colors
        success: {
          50: '#ecfdf5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          50: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        info: {
          50: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      
      fontFamily: {
        'sans': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'display': ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
      },
      
      fontSize: {
        'hero': ['3.75rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display': ['3rem', { lineHeight: '1.2', fontWeight: '600' }],
        '3xl': ['1.875rem', { lineHeight: '1.25', fontWeight: '600' }],
        '4xl': ['2.25rem', { lineHeight: '1.25', fontWeight: '600' }],
        '5xl': ['3rem', { lineHeight: '1.2', fontWeight: '600' }],
      },
      
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      
      borderRadius: {
        'sm': '0.375rem',
        'DEFAULT': '0.5rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      
      boxShadow: {
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'soft': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'medium': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'large': '0 20px 25px rgba(0, 0, 0, 0.15)',
        'brand': '0 4px 12px rgba(22, 163, 74, 0.25)',
        'brand-lg': '0 8px 25px rgba(22, 163, 74, 0.2)',
        'gold': '0 4px 12px rgba(234, 179, 8, 0.25)',
        'gold-lg': '0 6px 20px rgba(234, 179, 8, 0.35)',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'hover-lift': 'hoverLift 0.2s ease-out',
        'gentle-bounce': 'gentleBounce 2s infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        hoverLift: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-2px)' },
        },
        gentleBounce: {
          '0%, 20%, 53%, 80%, 100%': { transform: 'translateY(0)' },
          '40%, 43%': { transform: 'translateY(-4px)' },
          '70%': { transform: 'translateY(-2px)' },
          '90%': { transform: 'translateY(-1px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

## Phase 2: Component System Updates

### 2.1 Enhanced Button Components

**Add to `apps/web/src/app/globals.css`:**

```css
@layer components {
  /* Primary Button - Enhanced */
  .btn-primary-new {
    @apply bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 
           text-white font-semibold px-6 py-3.5 min-h-[48px] rounded-lg 
           shadow-brand hover:shadow-brand-lg transform hover:-translate-y-0.5 
           transition-all duration-200 ease-out focus:ring-4 focus:ring-brand-200 
           focus:outline-none active:transform active:scale-95;
  }
  
  /* Secondary Button - Enhanced */
  .btn-secondary-new {
    @apply bg-white border-2 border-brand-600 text-brand-600 hover:bg-sage-50 
           hover:border-brand-700 hover:text-brand-700 font-semibold px-6 py-3.5 
           min-h-[48px] rounded-lg shadow-soft hover:shadow-medium 
           transition-all duration-200 ease-out focus:ring-4 focus:ring-brand-200;
  }
  
  /* Accent Button - New Golden */
  .btn-accent-new {
    @apply bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 
           text-earth-700 font-semibold px-6 py-3.5 min-h-[48px] rounded-lg 
           shadow-gold hover:shadow-gold-lg transform hover:-translate-y-0.5 
           transition-all duration-200 ease-out focus:ring-4 focus:ring-gold-200;
  }
  
  /* Warm Button - New Cream/Beige */
  .btn-warm {
    @apply bg-gradient-to-r from-cream-50 to-cream-100 hover:from-cream-100 hover:to-cream-200 
           text-earth-700 border border-cream-200 hover:border-cream-300 
           font-semibold px-6 py-3.5 min-h-[48px] rounded-lg 
           shadow-soft hover:shadow-medium transition-all duration-200 ease-out;
  }
}
```

### 2.2 Enhanced Input Components

```css
@layer components {
  /* Primary Input - Enhanced */
  .input-primary-new {
    @apply w-full px-4 py-3.5 min-h-[48px] border-2 border-neutral-200 
           rounded-lg bg-white text-neutral-800 placeholder-neutral-400
           focus:border-brand-600 focus:ring-4 focus:ring-brand-100 
           transition-all duration-200 ease-out shadow-subtle
           hover:border-neutral-300 hover:shadow-soft;
  }
  
  /* Search Input - Enhanced */
  .input-search {
    @apply input-primary-new bg-sage-50 border-sage-200 
           focus:border-brand-500 focus:ring-sage-100 focus:bg-white;
  }
  
  /* Input with Icon */
  .input-with-icon {
    @apply pl-12 input-primary-new;
  }
}
```

### 2.3 Enhanced Card Components

```css
@layer components {
  /* Primary Card - Enhanced */
  .card-primary-new {
    @apply bg-white border border-neutral-200 rounded-xl p-6 
           shadow-soft hover:shadow-medium transition-all duration-200 ease-out 
           hover:-translate-y-1;
  }
  
  /* Feature Card - Green Theme */
  .card-feature-new {
    @apply bg-gradient-to-br from-sage-50 to-sage-100 
           border border-sage-200 rounded-xl p-6 
           shadow-brand hover:shadow-brand-lg transition-all duration-200 ease-out 
           hover:-translate-y-1;
  }
  
  /* Warm Card - Cream Theme */
  .card-warm-new {
    @apply bg-gradient-to-br from-cream-50 to-cream-100 
           border border-cream-200 rounded-xl p-6 
           shadow-soft hover:shadow-medium transition-all duration-200 ease-out 
           hover:-translate-y-1;
  }
  
  /* Accent Card - Gold Theme */
  .card-accent {
    @apply bg-gradient-to-br from-gold-50 to-gold-100 
           border border-gold-200 rounded-xl p-6 
           shadow-gold hover:shadow-gold-lg transition-all duration-200 ease-out 
           hover:-translate-y-1;
  }
  
  /* Hero Card - Large Feature */
  .card-hero {
    @apply bg-gradient-to-br from-sage-50 via-cream-50 to-sage-100 
           border border-sage-200 rounded-2xl p-8 
           shadow-large hover:shadow-brand-lg transition-all duration-300 ease-out;
  }
}
```

## Phase 3: Page-Specific Updates

### 3.1 Landing Page Enhancement

**Update `apps/web/src/app/page.tsx` with new styling:**

```tsx
// Update the background gradient
<div className="min-h-screen bg-gradient-to-br from-sage-50 via-cream-50 to-sage-100">

// Update header section
<header className="text-center mb-16 animate-fade-in">
  <div className="flex items-center justify-center mb-6">
    <ChefHat className="h-12 w-12 text-brand-600 mr-3" />
    <h1 className="text-display font-display text-neutral-800">ChefsCart</h1>
  </div>
  <HeadlineABTest className="text-center" />
</header>

// Update get started button
{isValidZip && (
  <button 
    onClick={handleGetStarted}
    className="btn-primary-new w-full mt-4 animate-gentle-bounce"
  >
    Get Started →
  </button>
)}

// Update how it works section
<section className="mb-16">
  <h2 className="text-4xl font-display font-bold text-center text-neutral-800 mb-12">
    How It Works
  </h2>
  <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
    {/* Step 1 - Updated styling */}
    <div className="card-feature-new text-center group">
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl w-20 h-20 
                      flex items-center justify-center mx-auto mb-6 shadow-brand 
                      group-hover:scale-110 group-hover:shadow-brand-lg 
                      transition-all duration-300">
        <span className="text-3xl font-bold text-white">1</span>
      </div>
      <h3 className="text-xl font-semibold mb-3 text-neutral-800 font-display">
        Tell Us Your Preferences
      </h3>
      <p className="text-neutral-600 leading-relaxed">
        Share your dietary needs, cooking skills, and meal preferences through our friendly chat wizard.
      </p>
    </div>
    
    {/* Similar updates for steps 2 and 3... */}
  </div>
</section>

// Update features section
<section className="card-hero max-w-5xl mx-auto">
  <h2 className="text-3xl font-display font-bold text-center text-neutral-800 mb-10">
    Why Choose ChefsCart?
  </h2>
  <div className="grid md:grid-cols-2 gap-8">
    {/* Feature items with new styling */}
    <div className="flex items-start space-x-4 group p-4 rounded-xl 
                    hover:bg-white hover:shadow-medium transition-all duration-300">
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl p-3 
                      flex-shrink-0 shadow-brand group-hover:scale-110 
                      group-hover:shadow-brand-lg transition-all duration-300">
        <Clock className="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 className="font-semibold mb-2 text-lg text-neutral-800 font-display">
          Save Time
        </h3>
        <p className="text-neutral-600">
          From meal planning to shopping cart in under 5 minutes
        </p>
      </div>
    </div>
    
    {/* Similar updates for other features... */}
  </div>
</section>
```

### 3.2 Chat Interface Updates

**Update key chat components with new styling:**

```tsx
// MessageBubble component updates
<div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
  <div className={`
    max-w-[80%] p-4 rounded-2xl shadow-soft
    ${isUser 
      ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white' 
      : 'bg-white border border-neutral-200 text-neutral-800'
    }
  `}>
    {content}
  </div>
</div>

// ChatInput component updates
<div className="border-t border-neutral-200 bg-gradient-to-r from-sage-50 to-cream-50 p-4">
  <div className="max-w-4xl mx-auto flex gap-3">
    <input
      className="input-primary-new flex-1"
      placeholder="Type your message..."
      value={input}
      onChange={(e) => setInput(e.target.value)}
    />
    <button className="btn-primary-new px-6">
      Send
    </button>
  </div>
</div>
```

## Phase 4: Testing & Validation

### 4.1 Visual Regression Testing

1. **Before/After Screenshots**
   - Take screenshots of key pages before changes
   - Compare after implementation
   - Document any unexpected changes

2. **Cross-Browser Testing**
   - Test on Chrome, Firefox, Safari, Edge
   - Verify gradient and shadow support
   - Check font loading and fallbacks

3. **Mobile Responsiveness**
   - Test on various device sizes
   - Verify touch target sizes (minimum 48px)
   - Check text readability on small screens

### 4.2 Accessibility Audit

1. **Color Contrast**
   - Run WAVE or axe accessibility checker
   - Verify all text meets WCAG AA standards
   - Test with high contrast mode

2. **Keyboard Navigation**
   - Tab through all interactive elements
   - Verify focus indicators are visible
   - Test screen reader compatibility

3. **Performance Impact**
   - Measure bundle size impact of new fonts
   - Check rendering performance with gradients
   - Optimize images and animations

## Migration Strategy

### Option 1: Gradual Migration (Recommended)
1. Implement new styles alongside existing ones
2. Use new class names (.btn-primary-new, .card-primary-new)
3. Update components one by one
4. Remove old styles once all components are updated

### Option 2: Feature Flag Migration
1. Add feature flag for new styles
2. Allow A/B testing of old vs new design
3. Gradually increase new design exposure
4. Full rollout once validated

### Option 3: Big Bang Migration
1. Update all styles at once
2. Requires extensive testing
3. Higher risk but faster implementation
4. Best for smaller projects

## Monitoring & Iteration

### Metrics to Track
- User engagement on updated pages
- Conversion rates on CTAs
- Accessibility compliance scores
- Performance metrics (LCP, CLS, FID)
- User feedback and support tickets

### Iteration Plan
- Week 1: Monitor initial deployment
- Week 2: Gather user feedback
- Week 3: Make refinements based on data
- Week 4: Full optimization and documentation

---

*This implementation guide should be followed step-by-step to ensure a smooth transition to the new brand style guide while maintaining functionality and accessibility.*