# ChefsCart Brand Style Guide
*Inspired by HomeChef's Fresh, Professional Design Language*

## Executive Summary

This style guide establishes ChefsCart's visual identity inspired by HomeChef's successful design aesthetic. The focus is on creating a **professional, fresh, and modern** experience that communicates trust, quality, and simplicity in meal planning and grocery delivery.

## 1. Color Palette

### Primary Green Palette
Building on our current brand foundation with a more sophisticated approach inspired by HomeChef:

#### Forest Green (Primary)
- **Primary Brand**: `#16a34a` (brand-600) - Main CTAs, headers, brand elements
- **Primary Hover**: `#15803d` (brand-700) - Interactive states
- **Primary Light**: `#22c55e` (brand-500) - Highlights and accents

#### Sage Green (Secondary)
- **Sage 50**: `#f0fdf4` - Page backgrounds, subtle containers
- **Sage 100**: `#dcfce7` - Card backgrounds, light sections  
- **Sage 200**: `#bbf7d0` - Subtle borders, dividers
- **Sage 300**: `#86efac` - Light accents, badges

#### Hunter Green (Tertiary)
- **Hunter 800**: `#166534` - Dark text, navigation
- **Hunter 900**: `#14532d` - Headings, primary text

### Complementary Earth Tones

#### Warm Beige/Cream
- **Cream 50**: `#fffef7` - Alternative background
- **Cream 100**: `#fefce8` - Warm containers
- **Cream 200**: `#fef08a` - Subtle highlights
- **Warm Sand**: `#f5f1eb` - Card backgrounds

#### Golden Yellow (Accent)
- **Gold 400**: `#facc15` - CTAs, important highlights
- **Gold 500**: `#eab308` - Warning states, special offers
- **Gold 600**: `#ca8a04` - Hover states for gold elements

#### Earthy Brown
- **Earth 600**: `#92400e` - Secondary text, warm accents
- **Earth 700**: `#78350f` - Footer, utility text
- **Earth 100**: `#fef7ed` - Warm background sections

### Neutral Grays
Professional and clean:

- **Pure White**: `#ffffff` - Main backgrounds, cards
- **Off White**: `#fafafa` - Alternative backgrounds
- **Light Gray**: `#f3f4f6` - Subtle backgrounds
- **Medium Gray**: `#6b7280` - Secondary text
- **Dark Gray**: `#374151` - Body text
- **Charcoal**: `#1f2937` - Headings, primary text

### Semantic Colors

#### Success
- **Success Green**: `#10b981` - Success messages, completed states
- **Success Light**: `#d1fae5` - Success backgrounds

#### Warning
- **Warning Orange**: `#f59e0b` - Caution messages
- **Warning Light**: `#fef3c7` - Warning backgrounds

#### Error
- **Error Red**: `#ef4444` - Error states, validation
- **Error Light**: `#fee2e2` - Error backgrounds

#### Info
- **Info Blue**: `#3b82f6` - Information messages
- **Info Light**: `#dbeafe` - Info backgrounds

## 2. Typography

### Font System
Following HomeChef's clean, readable approach:

#### Primary Font: Inter
- **Purpose**: All UI text, body copy, navigation
- **Weights**: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Characteristics**: Clean, modern, excellent readability

#### Secondary Font: Plus Jakarta Sans
- **Purpose**: Headlines, hero text, special emphasis
- **Weights**: 400 (Regular), 600 (Semibold), 700 (Bold), 800 (Extra Bold)
- **Characteristics**: Friendly, approachable, distinctive

### Typography Scale

#### Headings
```css
/* Hero/Display */
.text-hero {
  font-size: 3.75rem; /* 60px */
  line-height: 1.1;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

/* H1 */
.text-h1 {
  font-size: 3rem; /* 48px */
  line-height: 1.2;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

/* H2 */
.text-h2 {
  font-size: 2.25rem; /* 36px */
  line-height: 1.25;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

/* H3 */
.text-h3 {
  font-size: 1.875rem; /* 30px */
  line-height: 1.3;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
}

/* H4 */
.text-h4 {
  font-size: 1.5rem; /* 24px */
  line-height: 1.4;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
}
```

#### Body Text
```css
/* Large Body */
.text-lg {
  font-size: 1.125rem; /* 18px */
  line-height: 1.6;
  font-weight: 400;
}

/* Regular Body */
.text-base {
  font-size: 1rem; /* 16px */
  line-height: 1.6;
  font-weight: 400;
}

/* Small Text */
.text-sm {
  font-size: 0.875rem; /* 14px */
  line-height: 1.5;
  font-weight: 400;
}

/* Caption */
.text-xs {
  font-size: 0.75rem; /* 12px */
  line-height: 1.4;
  font-weight: 400;
}
```

## 3. Component Design System

### Buttons

#### Primary Buttons (CTAs)
```css
.btn-primary {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: #ffffff;
  padding: 0.875rem 2rem; /* 14px 32px */
  border-radius: 0.75rem; /* 12px */
  font-weight: 600;
  font-size: 1rem;
  min-height: 48px;
  border: none;
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
  transition: all 0.2s ease-out;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(22, 163, 74, 0.35);
  background: linear-gradient(135deg, #15803d 0%, #166534 100%);
}
```

#### Secondary Buttons
```css
.btn-secondary {
  background: #ffffff;
  color: #16a34a;
  border: 2px solid #16a34a;
  padding: 0.875rem 2rem;
  border-radius: 0.75rem;
  font-weight: 600;
  min-height: 48px;
  transition: all 0.2s ease-out;
}

.btn-secondary:hover {
  background: #f0fdf4;
  border-color: #15803d;
  color: #15803d;
}
```

#### Accent Buttons (Gold/Yellow)
```css
.btn-accent {
  background: linear-gradient(135deg, #facc15 0%, #eab308 100%);
  color: #78350f;
  padding: 0.875rem 2rem;
  border-radius: 0.75rem;
  font-weight: 600;
  min-height: 48px;
  border: none;
  box-shadow: 0 4px 12px rgba(234, 179, 8, 0.25);
}

.btn-accent:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(234, 179, 8, 0.35);
}
```

### Input Fields

#### Primary Input
```css
.input-primary {
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  min-height: 48px;
  transition: all 0.2s ease-out;
}

.input-primary:focus {
  border-color: #16a34a;
  box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.1);
  outline: none;
}

.input-primary::placeholder {
  color: #9ca3af;
}
```

### Cards

#### Primary Card
```css
.card-primary {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 1rem; /* 16px */
  padding: 1.5rem; /* 24px */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-out;
}

.card-primary:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}
```

#### Feature Card (Green Accent)
```css
.card-feature {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid #bbf7d0;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.1);
}
```

#### Warm Card (Beige/Cream)
```css
.card-warm {
  background: linear-gradient(135deg, #fffef7 0%, #fefce8 100%);
  border: 1px solid #fef08a;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(234, 179, 8, 0.1);
}
```

## 4. Layout & Spacing

### Spacing Scale
Following an 8px base grid system:

```css
:root {
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 1rem;      /* 16px */
  --spacing-lg: 1.5rem;    /* 24px */
  --spacing-xl: 2rem;      /* 32px */
  --spacing-2xl: 3rem;     /* 48px */
  --spacing-3xl: 4rem;     /* 64px */
  --spacing-4xl: 6rem;     /* 96px */
}
```

### Grid System
- **Container**: `max-width: 1200px`, centered with `margin: 0 auto`
- **Columns**: CSS Grid with `grid-template-columns: repeat(12, 1fr)`
- **Gaps**: `gap: 1.5rem` (24px) for desktop, `gap: 1rem` (16px) for mobile

### Border Radius
```css
:root {
  --radius-sm: 0.375rem;    /* 6px - small elements */
  --radius-md: 0.5rem;      /* 8px - buttons, inputs */
  --radius-lg: 0.75rem;     /* 12px - cards, containers */
  --radius-xl: 1rem;        /* 16px - large cards */
  --radius-2xl: 1.5rem;     /* 24px - hero sections */
}
```

## 5. Visual Effects

### Shadows
```css
:root {
  /* Light shadows for subtle elevation */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Green-tinted shadows for brand elements */
  --shadow-green: 0 4px 12px rgba(22, 163, 74, 0.25);
  --shadow-green-lg: 0 8px 25px rgba(22, 163, 74, 0.2);
  
  /* Gold-tinted shadows for accent elements */
  --shadow-gold: 0 4px 12px rgba(234, 179, 8, 0.25);
}
```

### Animations
```css
:root {
  --transition-fast: 0.15s ease-out;
  --transition-normal: 0.25s ease-out;
  --transition-slow: 0.4s ease-out;
}

/* Hover Effects */
.hover-lift {
  transition: all var(--transition-normal);
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.hover-scale {
  transition: transform var(--transition-fast);
}

.hover-scale:hover {
  transform: scale(1.02);
}
```

## 6. Responsive Breakpoints

```css
/* Mobile First Approach */
:root {
  --breakpoint-sm: 640px;   /* Small tablets */
  --breakpoint-md: 768px;   /* Tablets */
  --breakpoint-lg: 1024px;  /* Small desktops */
  --breakpoint-xl: 1280px;  /* Large desktops */
}

/* Usage */
@media (min-width: 768px) {
  .responsive-text {
    font-size: 1.125rem; /* Larger on tablets+ */
  }
}
```

## 7. Accessibility Guidelines

### Color Contrast
- **Minimum**: WCAG AA (4.5:1 for normal text, 3:1 for large text)
- **Target**: WCAG AAA (7:1 for normal text, 4.5:1 for large text)

### Focus States
```css
*:focus-visible {
  outline: 2px solid #16a34a;
  outline-offset: 2px;
  border-radius: 0.25rem;
}
```

### Text Sizing
- Minimum body text: 16px
- Minimum touch targets: 48px × 48px
- Line height: 1.5-1.6 for body text

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Priority: High**

1. **Update CSS Variables**
   - Replace current green palette with new sophisticated colors
   - Add beige/cream complementary colors
   - Add golden yellow accent colors
   - Update neutral gray scale

2. **Typography System**
   - Import Plus Jakarta Sans font
   - Update heading styles with new font hierarchy
   - Implement responsive typography scale

3. **Core Component Updates**
   - Button system redesign with new colors and effects
   - Input field styling with improved focus states
   - Card component variants (primary, feature, warm)

**Files to Update:**
- `/apps/web/src/app/globals.css`
- `/apps/web/tailwind.config.ts`

### Phase 2: Component Enhancement (Week 3)
**Priority: Medium**

1. **Navigation & Header**
   - Update header styling with new brand colors
   - Improve navigation hover states
   - Add subtle brand gradients

2. **Landing Page Redesign**
   - Apply new color palette to hero section
   - Update feature cards with warm/green variants
   - Enhance hover effects and animations

3. **Chat Interface**
   - Apply new styling to conversation bubbles
   - Update input fields and buttons
   - Improve visual hierarchy

**Files to Update:**
- `/apps/web/src/app/page.tsx`
- `/apps/web/components/ConversationalChat/ConversationalChat.tsx`
- `/apps/web/components/ConversationalChat/MessageBubble.tsx`

### Phase 3: Advanced Features (Week 4)
**Priority: Low**

1. **Advanced Animations**
   - Implement micro-interactions
   - Add page transition effects
   - Create loading state animations

2. **Responsive Optimization**
   - Fine-tune mobile experience
   - Optimize tablet layouts
   - Improve touch interactions

3. **Accessibility Enhancements**
   - Audit color contrast ratios
   - Improve focus management
   - Add screen reader optimizations

## 9. Design Tokens (CSS Custom Properties)

```css
:root {
  /* Brand Colors */
  --color-primary: #16a34a;
  --color-primary-hover: #15803d;
  --color-primary-light: #22c55e;
  
  /* Complementary Colors */
  --color-sage-50: #f0fdf4;
  --color-sage-100: #dcfce7;
  --color-sage-200: #bbf7d0;
  
  --color-cream-50: #fffef7;
  --color-cream-100: #fefce8;
  --color-warm-sand: #f5f1eb;
  
  --color-gold-400: #facc15;
  --color-gold-500: #eab308;
  --color-gold-600: #ca8a04;
  
  --color-earth-600: #92400e;
  --color-earth-700: #78350f;
  --color-earth-100: #fef7ed;
  
  /* Spacing */
  --spacing-unit: 0.25rem; /* 4px base */
  
  /* Typography */
  --font-primary: 'Inter', sans-serif;
  --font-display: 'Plus Jakarta Sans', sans-serif;
  
  /* Borders */
  --border-radius-sm: 0.375rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 0.75rem;
  --border-radius-xl: 1rem;
  
  /* Shadows */
  --shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-soft: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-medium: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-brand: 0 4px 12px rgba(22, 163, 74, 0.25);
  --shadow-accent: 0 4px 12px rgba(234, 179, 8, 0.25);
}
```

## 10. Brand Personality

### Visual Characteristics
- **Clean & Minimal**: Generous white space, clear hierarchy
- **Warm & Approachable**: Earth tones, friendly typography
- **Fresh & Natural**: Green palette, organic feeling
- **Professional & Trustworthy**: Consistent styling, quality typography
- **Modern & Innovative**: Subtle animations, contemporary design

### Tone & Voice Alignment
- Professional yet friendly
- Confident but not intimidating
- Helpful and supportive
- Clean and organized
- Encouraging and positive

---

*This style guide is a living document that should be updated as the brand evolves. All implementations should prioritize accessibility, performance, and user experience.*