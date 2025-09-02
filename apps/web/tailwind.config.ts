import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      'xs': '320px',    // Small mobile devices
      'sm': '375px',    // iPhone standard
      'md': '414px',    // Large mobile devices
      'lg': '768px',    // Tablets
      'xl': '1024px',   // Desktop
      '2xl': '1280px',  // Large desktop
    },
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
        
        // Sage Green (Accent - replaces gold)
        sage: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',  // Primary accent
          500: '#22c55e',  // Medium
          600: '#16a34a',  // Dark
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
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
        'sage': '0 4px 12px rgba(34, 197, 94, 0.25)',
        'sage-lg': '0 6px 20px rgba(34, 197, 94, 0.35)',
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
