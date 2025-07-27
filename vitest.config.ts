/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Environment setup
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    
    // Coverage configuration with quality gates
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/.next/**',
        'functions/**', // Firebase functions
        'docs/**',
        '**/*.md'
      ],
      // Quality gates - fail build if coverage drops below thresholds
      thresholds: {
        global: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80
        }
      },
      // Specific file thresholds for critical components
      perFile: true
    },
    
    // Test file patterns
    include: [
      'tests/**/*.{test,spec}.{js,ts,tsx}',
      'src/**/*.{test,spec}.{js,ts,tsx}',
      'components/**/*.{test,spec}.{js,ts,tsx}',
      'apps/web/components/**/*.{test,spec}.{js,ts,tsx}',
      'apps/web/src/**/*.{test,spec}.{js,ts,tsx}'
    ],
    
    // Performance and timeout settings
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    },
    
    // Globals for testing
    globals: true,
    
    // Reporter configuration
    reporter: [
      'verbose',
      'json',
      'html'
    ],
    
    // Output configuration
    outputFile: {
      json: './tests/results/test-results.json',
      html: './tests/results/test-results.html'
    }
  },
  
  // Resolve configuration for Next.js compatibility
  resolve: {
    alias: {
      '@': resolve(__dirname, './apps/web/src'),
      '@/components': resolve(__dirname, './apps/web/components'),
      '@/lib': resolve(__dirname, './apps/web/lib'),
      '@/types': resolve(__dirname, './apps/web/types')
    }
  },
  
  // Define for Next.js environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify('test')
  }
})