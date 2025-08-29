# Instacart API Caching Implementation

## Overview

This implementation creates a robust caching layer for Instacart API calls to solve performance and reliability issues. Instead of making live API calls for every ZIP code and retailer lookup, we pre-populate a Supabase cache and refresh it monthly.

## Problem Statement

**Before Implementation:**
- ❌ Instacart API calls taking 15-40+ seconds 
- ❌ 500/504 errors from unstable dev environment
- ❌ Poor user experience with timeouts
- ❌ No rate limit transparency from Instacart

**After Implementation:**
- ✅ Sub-second response times from cache
- ✅ Graceful fallback to live API when needed
- ✅ Monthly bulk refresh via cron job
- ✅ Comprehensive error handling and monitoring

## Architecture

### Database Schema (`scripts/instacart-cache-schema.sql`)

#### `zip_code_cache` Table
Stores ZIP code validation results:
- `zip_code` (PK): 5-digit ZIP code
- `has_instacart_coverage`: Whether Instacart serves this area
- `retailer_count`: Number of available stores
- `last_updated`: Cache freshness tracking
- `api_response_status`: Last API response code

#### `retailers_cache` Table  
Stores retailer details per ZIP code:
- `zip_code` (FK): Links to zip_code_cache
- `retailer_key`, `retailer_name`, `retailer_logo_url`: Instacart data
- `priority_score`: Our custom prioritization (0=highest)
- `is_active`: Soft deletion flag

#### `instacart_sync_jobs` Table
Tracks batch job execution:
- Job status, timing, and error tracking
- API call metrics and success rates
- Monitoring and debugging support

### Batch Job (`scripts/populate-instacart-cache.js`)

**Smart Rate Limiting:**
- **Default**: 10 requests/second (based on current API performance)
- **Conservative**: 5 req/sec (use `--conservative` flag)
- **Aggressive**: 20 req/sec (use `--aggressive` flag)
- 10-second timeout per request
- 3 retry attempts with exponential backoff
- Processes ZIP codes in batches of 100
- Auto-detects rate limits (429 responses)

**Priority Scoring:**
Matches existing retailer prioritization:
- **Priority 0**: Whole Foods (highest)
- **Priority 0.5**: Major chains (Kroger, Publix, Aldi)
- **Priority 1**: Premium grocers (Trader Joe's, Wegmans)
- **Priority 5+**: Convenience stores (filtered out when ≥3 grocery options)

**Execution Estimates:**
- **Test Mode**: 30 ZIP codes (~3 seconds at 10 req/sec)
- **Conservative**: 41,552 ZIP codes (~2.3 hours at 5 req/sec)
- **Default**: 41,552 ZIP codes (~1.2 hours at 10 req/sec)
- **Aggressive**: 41,552 ZIP codes (~35 minutes at 20 req/sec)

## API Endpoints

### `/api/validate-zip-cached` (NEW)
Replaces `/api/validate-zip` with caching:

**Cache Strategy:**
1. **Cache Hit** (data < 30 days): Instant response
2. **Cache Miss**: Live API call + cache update  
3. **API Failure**: Use stale cache if available
4. **Complete Failure**: Optimistic fallback

### `/api/retailers-cached` (NEW)  
Replaces `/api/retailers` with caching:

**Features:**
- Uses Supabase stored procedure `get_cached_retailers()`
- Maintains existing priority filtering
- Cache-aware with age tracking
- Graceful degradation on failures

## Deployment Guide

### 1. Database Setup
```bash
# Deploy schema to Supabase
psql -h [host] -U [user] -d [db] -f scripts/instacart-cache-schema.sql
```

### 2. Initial Cache Population
```bash
# Test run (30 ZIP codes)
node scripts/populate-instacart-cache.js --test

# Full population (run during low-traffic hours)
node scripts/populate-instacart-cache.js
```

### 3. Cron Job Setup

**Traditional Server:**
```bash
# Add to crontab - runs 1st of each month at 2 AM
0 2 1 * * /path/to/chefscart/scripts/cron-instacart-sync.sh
```

**Vercel Deployment:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/instacart-sync",
      "schedule": "0 2 1 * *"
    }
  ]
}
```

### 4. Update Frontend Usage
Replace existing API calls:
```javascript
// OLD
fetch('/api/validate-zip', { ... })
fetch('/api/retailers', { ... })

// NEW (cached)
fetch('/api/validate-zip-cached', { ... })  
fetch('/api/retailers-cached', { ... })
```

## Performance Metrics

### Expected Improvements
- **Response Time**: 15-40s → <500ms (98%+ improvement)
- **Success Rate**: ~60% → 99%+ (with fallbacks)
- **API Costs**: Reduced by ~99% (bulk monthly vs per-request)
- **User Experience**: Instant ZIP validation, reliable store lookup

### Monitoring
Track via `instacart_sync_jobs` table:
- Job completion time and success rate
- API call volume and error rates  
- Cache hit ratios
- Failed ZIP codes requiring manual review

## Rate Limit Considerations

### Research Findings
- Instacart doesn't publish specific rate limits
- Conservative estimate: 1-10 requests/second
- 429 errors when exceeded, contact required for increases
- Development environment appears less stable than production

### Batch Job Rate Limiting
- **Current**: 10 req/sec (optimized based on API performance)
- **Flexible**: `--conservative` (5 req/sec), `--aggressive` (20 req/sec)
- **Auto-detection**: Warns if 429 rate limit errors occur
- **Monitoring**: Tracks actual rate achieved
- **Failure Handling**: Exponential backoff on errors

## Maintenance

### Monthly Sync Process
1. **Automated Execution**: Cron triggers batch job
2. **Fresh Data**: Updates all cached ZIP codes and retailers  
3. **Monitoring**: Logs completion stats and errors
4. **Alerting**: Notification on job failure

### Cache Invalidation
- **Age-based**: Data older than 30 days triggers fresh API call
- **Error-based**: API failures fall back to stale cache
- **Manual**: Can force refresh specific ZIP codes if needed

### Scaling Considerations
- **Storage**: ~41K ZIP × ~10 retailers = ~410K cache entries
- **Bandwidth**: Monthly bulk refresh vs daily per-request API calls
- **Cost**: Supabase storage costs vs Instacart API costs

## Migration Strategy

### Phase 1: Parallel Deployment ✅
- Deploy cache infrastructure
- Create cached API endpoints
- Keep existing endpoints active

### Phase 2: Gradual Rollout
- Update frontend to use cached endpoints
- Monitor performance and error rates
- Keep fallback to original endpoints

### Phase 3: Full Migration
- Switch all traffic to cached endpoints
- Remove original API endpoints
- Monitor for 30 days before cleanup

## Files Created

### Database
- `scripts/instacart-cache-schema.sql` - Cache table definitions

### Batch Processing  
- `scripts/populate-instacart-cache.js` - Main population script
- `scripts/cron-instacart-sync.sh` - Monthly cron job wrapper

### API Endpoints
- `apps/web/src/app/api/validate-zip-cached/route.ts` - Cached ZIP validation
- `apps/web/src/app/api/retailers-cached/route.ts` - Cached retailer lookup

### Documentation
- `docs/INSTACART_CACHE_IMPLEMENTATION.md` - This comprehensive guide

## Success Metrics

### Technical Metrics
- **API Response Time**: Target <500ms (from 15-40s)
- **Cache Hit Rate**: Target >95%  
- **Job Success Rate**: Target >99%
- **Error Rate**: Target <1%

### Business Metrics
- **User Drop-off**: Reduce ZIP validation abandonment
- **Onboarding Completion**: Improve retailer selection rates
- **Support Tickets**: Reduce API timeout complaints

This implementation transforms a major bottleneck into a competitive advantage, providing instant, reliable access to Instacart's retailer network while significantly reducing API costs and improving user experience.