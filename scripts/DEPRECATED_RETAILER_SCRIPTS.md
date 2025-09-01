# Deprecated Retailer Scripts

These scripts are **DEPRECATED** as of August 31, 2025. The ZIP code cache system has been simplified to only track coverage (boolean), not retailer details.

## Deprecated Scripts (DO NOT USE):

### ❌ `retry-no-retailer-zips.js`
- **Status**: Deprecated
- **Reason**: We no longer collect or store retailer data
- **Replacement**: Use `simple-zip-coverage.cjs` for coverage-only checking

### ❌ `populate-instacart-cache.js` 
- **Status**: Deprecated  
- **Reason**: Too complex, collected unnecessary retailer data
- **Replacement**: Use `simple-zip-coverage.cjs` for efficient coverage checking

### ❌ `comprehensive-zip-cache.cjs`
- **Status**: Deprecated
- **Reason**: Tried to process 100,000 ZIP codes instead of real ~41,000
- **Replacement**: Use `simple-zip-coverage.cjs` with realistic ZIP ranges

### ❌ `optimized-zip-cache.cjs`
- **Status**: Deprecated
- **Reason**: Still collected retailer data, used too many ZIP codes
- **Replacement**: Use `simple-zip-coverage.cjs` for simplified approach

## Current Active Script:

### ✅ `simple-zip-coverage.cjs`
- **Status**: ACTIVE
- **Purpose**: Check Instacart coverage for real US ZIP codes (~41,000)
- **Data Stored**: Only `zip_code` and `has_instacart_coverage` boolean
- **Performance**: 10-20 req/sec, processes only real ZIP codes
- **Usage**: 
  ```bash
  cd scripts && node simple-zip-coverage.cjs --conservative  # 10 req/sec
  cd scripts && node simple-zip-coverage.cjs                 # 20 req/sec
  ```

## Database Schema Changes:

### Deprecated Tables:
- `retailers_cache` - DROPPED (use `clean-zip-cache-schema.sql`)
- `zip_retailers_prioritized` - DROPPED (view)

### Deprecated Columns:
- `zip_code_cache.retailer_count` - REMOVED
- `zip_code_cache.state` - REMOVED (optional, not used)
- `zip_code_cache.city` - REMOVED (optional, not used)

### Current Schema:
```sql
zip_code_cache:
- zip_code (PRIMARY KEY)
- is_valid (boolean)
- has_instacart_coverage (boolean) 
- last_updated (timestamp)
- last_api_check (timestamp)
- api_response_status (integer)
- created_at (timestamp)
```

## Migration Steps:

1. **Clean Database**: Run `scripts/clean-zip-cache-schema.sql` in Supabase SQL Editor
2. **Populate Cache**: Run `scripts/simple-zip-coverage.cjs` 
3. **Delete Files**: Optionally remove deprecated scripts after confirming new system works

## Why This Change:

- **Simpler**: Only store what we need (coverage yes/no)
- **Faster**: No JSON parsing, just HTTP status codes  
- **Efficient**: Process real ZIP codes only (~41K vs 100K)
- **Maintainable**: Single script instead of multiple complex ones
- **Cost-effective**: Fewer API calls, faster processing