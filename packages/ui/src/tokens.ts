// ChefsCart Design System Tokens (from PRD §3)

export const colors = {
  primary: {
    orange: {
      600: '#E65300',
      50: '#FFF1E6',
    },
  },
  accent: {
    lime: {
      500: '#A3D34E',
    },
    sky: {
      500: '#4BB8F2',
    },
  },
  neutral: {
    100: '#FFFAF2',
    900: '#2F3438',
  },
} as const;

export const borderRadius = {
  button: '12px',
  card: '24px',
} as const;

export const spacing = {
  4: '4px',
  8: '8px',
  12: '12px',
  16: '16px',
  24: '24px',
  32: '32px',
  48: '48px',
  64: '64px',
} as const;

export const shadows = {
  1: '0 2px 4px rgba(0,0,0,.06)',
} as const;

export const typography = {
  fontFamily: {
    sans: ['Inter', 'sans-serif'],
    display: ['Caveat', 'cursive'],
  },
  fontSize: {
    body: '16px',
  },
  lineHeight: {
    body: '24px',
  },
  letterSpacing: {
    tight: '-0.02em',
  },
} as const;