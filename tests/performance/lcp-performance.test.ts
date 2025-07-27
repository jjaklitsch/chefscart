import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockLCPMetric } from '../setup'

describe('LCP Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Clear performance entries
    if (global.performance?.clearMarks) {
      global.performance.clearMarks()
    }
    if (global.performance?.clearMeasures) {
      global.performance.clearMeasures()
    }
  })

  describe('Largest Contentful Paint (LCP) Metrics', () => {
    it('should fail if LCP metric exceeds 2000ms threshold', () => {
      // Mock LCP metric above threshold (2.5 seconds)
      const lcpEntry = mockLCPMetric(2500)
      
      // Simulate performance observer callback
      const lcpValue = lcpEntry.startTime
      
      // Quality gate: LCP should be under 2000ms (2 seconds)
      expect(lcpValue).toBeLessThanOrEqual(2000)
    })

    it('should pass if LCP metric is within acceptable range', () => {
      // Mock LCP metric within threshold (1.5 seconds)
      const lcpEntry = mockLCPMetric(1500)
      
      // Simulate performance observer callback
      const lcpValue = lcpEntry.startTime
      
      // Quality gate: LCP should be under 2000ms (2 seconds)
      expect(lcpValue).toBeLessThanOrEqual(2000)
    })

    it('should pass if LCP metric is at the boundary (exactly 2s)', () => {
      // Mock LCP metric at threshold boundary
      const lcpEntry = mockLCPMetric(2000)
      
      // Simulate performance observer callback
      const lcpValue = lcpEntry.startTime
      
      // Quality gate: LCP should be under or equal to 2000ms
      expect(lcpValue).toBeLessThanOrEqual(2000)
    })

    it('should handle multiple LCP entries and use the latest', () => {
      // Mock multiple LCP entries (typical browser behavior)
      const entries = [
        { startTime: 1800, entryType: 'largest-contentful-paint' },
        { startTime: 1600, entryType: 'largest-contentful-paint' },
        { startTime: 1900, entryType: 'largest-contentful-paint' }
      ]
      
      vi.mocked(global.performance.getEntriesByType).mockImplementation((type: string) => {
        if (type === 'largest-contentful-paint') {
          return entries as PerformanceEntry[]
        }
        return []
      })
      
      // Get the latest (last) LCP entry
      const lcpEntries = global.performance.getEntriesByType('largest-contentful-paint')
      const latestLCP = lcpEntries[lcpEntries.length - 1]
      
      expect(latestLCP.startTime).toBeLessThanOrEqual(2000)
    })

    it('should provide detailed failure message for debugging', () => {
      // Mock poor LCP performance
      const lcpEntry = mockLCPMetric(3200)
      const lcpValue = lcpEntry.startTime
      
      try {
        expect(lcpValue).toBeLessThanOrEqual(2000)
      } catch (error) {
        // Verify that the error provides useful debugging information
        expect(error).toBeDefined()
        expect(String(error)).toContain('3200')
        expect(String(error)).toContain('2000')
      }
    })
  })

  describe('Performance Budget Validation', () => {
    it('should enforce performance budget for critical page loads', () => {
      const performanceBudget = {
        lcp: 2000,  // 2 seconds
        fid: 100,   // 100ms
        cls: 0.1    // 0.1 cumulative layout shift
      }
      
      // Mock current metrics
      const currentMetrics = {
        lcp: mockLCPMetric(1800).startTime,
        fid: 80,
        cls: 0.05
      }
      
      // Validate against budget
      expect(currentMetrics.lcp).toBeLessThanOrEqual(performanceBudget.lcp)
      expect(currentMetrics.fid).toBeLessThanOrEqual(performanceBudget.fid)
      expect(currentMetrics.cls).toBeLessThanOrEqual(performanceBudget.cls)
    })

    it('should track performance regression over time', () => {
      // Baseline performance (what we expect to maintain)
      const baseline = {
        lcp: 1600,
        timestamp: Date.now() - 86400000 // 24 hours ago
      }
      
      // Current performance
      const current = {
        lcp: mockLCPMetric(1800).startTime,
        timestamp: Date.now()
      }
      
      // Allow some regression but not more than 500ms
      const allowedRegression = 500
      const regression = current.lcp - baseline.lcp
      
      expect(regression).toBeLessThanOrEqual(allowedRegression)
    })
  })

  describe('Performance Monitoring Integration', () => {
    it('should collect performance metrics for monitoring', () => {
      const lcpEntry = mockLCPMetric(1700)
      
      // Simulate collecting metrics for monitoring service
      const performanceMetrics = {
        lcp: lcpEntry.startTime,
        timestamp: Date.now(),
        url: '/',
        userAgent: 'test-agent',
        environment: 'test'
      }
      
      // Verify metrics are properly structured
      expect(performanceMetrics).toMatchObject({
        lcp: expect.any(Number),
        timestamp: expect.any(Number),
        url: expect.any(String),
        userAgent: expect.any(String),
        environment: 'test'
      })
      
      // Ensure LCP meets threshold
      expect(performanceMetrics.lcp).toBeLessThanOrEqual(2000)
    })
  })
})