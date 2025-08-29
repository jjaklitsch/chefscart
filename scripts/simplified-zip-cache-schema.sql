-- Simplified ZIP Code Cache Schema
-- Run this in Supabase SQL Editor to simplify the structure

-- First, drop the foreign key constraint from retailers_cache (if it still exists)
DROP TABLE IF EXISTS retailers_cache CASCADE;
DROP VIEW IF EXISTS zip_retailers_prioritized CASCADE;

-- Recreate zip_code_cache table with simplified structure
DROP TABLE IF EXISTS zip_code_cache CASCADE;

CREATE TABLE zip_code_cache (
    zip_code VARCHAR(5) PRIMARY KEY,
    is_valid BOOLEAN NOT NULL DEFAULT false,
    has_instacart_coverage BOOLEAN NOT NULL DEFAULT false,
    state VARCHAR(2),
    city VARCHAR(100), 
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_api_check TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    api_response_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_zip_code_cache_has_coverage ON zip_code_cache(has_instacart_coverage);
CREATE INDEX IF NOT EXISTS idx_zip_code_cache_last_updated ON zip_code_cache(last_updated);

-- Comments
COMMENT ON TABLE zip_code_cache IS 'Simplified cache of ZIP code Instacart availability';
COMMENT ON COLUMN zip_code_cache.has_instacart_coverage IS 'True if Instacart delivers to this ZIP code';

-- Keep instacart_sync_jobs for tracking
-- (This table is still useful for monitoring the cron job)