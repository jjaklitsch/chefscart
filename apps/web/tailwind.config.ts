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
        // Background variables (keep for system compatibility)
        background: "var(--background)",
        foreground: "var(--foreground)",
        
        // ChefsCart Green Brand Palette
        brand: {
          // Primary Green Scale
          50: '#f0fdf4',   // Lightest background
          100: '#dcfce7',  // Card backgrounds
          200: '#bbf7d0',  // Subtle accents
          300: '#86efac',  // Light accents
          400: '#4ade80',  // Medium green
          500: '#22c55e',  // Bright highlights
          600: '#16a34a',  // Primary brand color
          700: '#15803d',  // Hover states
          800: '#166534',  // Dark green
          900: '#14532d',  // Darkest text
        },
        
        // Fresh/Lime Accent Scale
        fresh: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',  // Fresh ingredients
          600: '#65a30d',  // Secondary actions
          700: '#4d7c0f',
          800: '#365314',
          900: '#1a2e05',
        },
        
        // Mint/Emerald Success Scale
        mint: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',  // Success states
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        
        // Semantic Colors
        success: '#10b981',     // Emerald-500
        warning: '#f59e0b',     // Amber-500
        error: '#ef4444',       // Red-500
        info: '#3b82f6',        // Blue-500
        
        // Text Colors
        text: {
          primary: '#1f2937',    // Gray-800
          secondary: '#6b7280',  // Gray-500
          muted: '#9ca3af',      // Gray-400
          inverse: '#ffffff',    // White
        },
        
        // Neutral Grays (enhanced scale)
        neutral: {
          0: '#ffffff',
          50: '#f9fafb',
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
        }
      },
      
      // Enhanced Spacing Scale
      spacing: {
        '18': '4.5rem',    // 72px
        '22': '5.5rem',    // 88px
        '88': '22rem',     // 352px
        '100': '25rem',    // 400px
        '112': '28rem',    // 448px
        '128': '32rem',    // 512px
      },
      
      // Typography Scale
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.2' }],
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
      },
      
      // Border Radius Scale
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',    // 2px
        'DEFAULT': '0.25rem', // 4px
        'md': '0.375rem',    // 6px
        'lg': '0.5rem',      // 8px
        'xl': '0.75rem',     // 12px
        '2xl': '1rem',       // 16px
        '3xl': '1.5rem',     // 24px
        'full': '9999px',
      },
      
      // Shadow Scale
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'green': '0 4px 12px rgba(22, 163, 74, 0.25)',
        'green-lg': '0 10px 25px rgba(22, 163, 74, 0.15)',
      },
      
      // Animation
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-green': 'pulseGreen 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounceGentle 1s infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGreen: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        bounceGentle: {
          '0%, 20%, 53%, 80%, 100%': { transform: 'translateY(0)' },
          '40%, 43%': { transform: 'translateY(-2px)' },
          '70%': { transform: 'translateY(-1px)' },
          '90%': { transform: 'translateY(-0.5px)' },
        },
      },
      
      // Gradient Stops
      gradientColorStops: {
        'brand-light': '#f0fdf4',
        'brand-medium': '#dcfce7',
        'fresh-light': '#f7fee7',
        'fresh-medium': '#ecfccb',
      }
    },
  },
  plugins: [],
};

export default config;
