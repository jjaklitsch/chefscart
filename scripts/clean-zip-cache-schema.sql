-- Clean ZIP Code Cache Schema - Remove Retailer Dependencies
-- Run this in Supabase SQL Editor to remove retailer-related tables and columns

-- Step 1: Drop retailer-related tables (if they exist)
DROP TABLE IF EXISTS retailers_cache CASCADE;
DROP VIEW IF EXISTS zip_retailers_prioritized CASCADE;
DROP TABLE IF EXISTS instacart_sync_jobs CASCADE; -- Optional: Keep if you want to track sync jobs

-- Step 2: Remove retailer-related columns from zip_code_cache (if they exist)
ALTER TABLE zip_code_cache DROP COLUMN IF EXISTS retailer_count;
ALTER TABLE zip_code_cache DROP COLUMN IF EXISTS state CASCADE;
ALTER TABLE zip_code_cache DROP COLUMN IF EXISTS city CASCADE;

-- Step 3: Ensure zip_code_cache has the simplified schema
-- (This will not fail if columns already exist)
ALTER TABLE zip_code_cache 
ADD COLUMN IF NOT EXISTS is_valid BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS has_instacart_coverage BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
ADD COLUMN IF NOT EXISTS last_api_check TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
ADD COLUMN IF NOT EXISTS api_response_status INTEGER,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Step 4: Update indexes for performance (remove old, add new)
DROP INDEX IF EXISTS idx_retailers_cache_zip_code;
DROP INDEX IF EXISTS idx_retailers_cache_priority;
DROP INDEX IF EXISTS idx_zip_code_cache_retailer_count;

-- Create optimized indexes for coverage lookup
CREATE INDEX IF NOT EXISTS idx_zip_code_cache_coverage ON zip_code_cache(has_instacart_coverage);
CREATE INDEX IF NOT EXISTS idx_zip_code_cache_last_updated ON zip_code_cache(last_updated);
CREATE INDEX IF NOT EXISTS idx_zip_code_cache_api_check ON zip_code_cache(last_api_check);

-- Step 5: Update table comment
COMMENT ON TABLE zip_code_cache IS 'Simplified cache of ZIP code Instacart availability (coverage only, no retailer details)';
COMMENT ON COLUMN zip_code_cache.has_instacart_coverage IS 'True if Instacart delivers to this ZIP code (based on API status 200 vs 404)';

-- Step 6: Optional - Clean up any existing retailer data in zip_code_cache
-- UPDATE zip_code_cache SET retailer_count = NULL WHERE retailer_count IS NOT NULL;

-- Verification query - run this to confirm the cleaned schema
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'zip_code_cache' 
ORDER BY ordinal_position;