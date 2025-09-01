-- Simplified ZIP Code Cache Schema (Coverage Only)
-- Run this in Supabase SQL Editor to create the simplified structure

-- First, drop retailer-related tables (if they exist)
DROP TABLE IF EXISTS retailers_cache CASCADE;
DROP VIEW IF EXISTS zip_retailers_prioritized CASCADE;

-- Recreate zip_code_cache table with minimal structure (coverage only)
DROP TABLE IF EXISTS zip_code_cache CASCADE;

CREATE TABLE zip_code_cache (
    zip_code VARCHAR(5) PRIMARY KEY,
    is_valid BOOLEAN NOT NULL DEFAULT false,
    has_instacart_coverage BOOLEAN NOT NULL DEFAULT false,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_api_check TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    api_response_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_zip_code_cache_coverage ON zip_code_cache(has_instacart_coverage);
CREATE INDEX IF NOT EXISTS idx_zip_code_cache_last_updated ON zip_code_cache(last_updated);
CREATE INDEX IF NOT EXISTS idx_zip_code_cache_api_check ON zip_code_cache(last_api_check);

-- Comments
COMMENT ON TABLE zip_code_cache IS 'Simplified cache of ZIP code Instacart coverage (boolean only, no retailer details)';
COMMENT ON COLUMN zip_code_cache.has_instacart_coverage IS 'True if Instacart delivers to this ZIP code (based on API status 200 vs 404)';

-- Optional: Keep instacart_sync_jobs for tracking batch operations
CREATE TABLE IF NOT EXISTS instacart_sync_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    zip_codes_total INTEGER,
    zip_codes_processed INTEGER DEFAULT 0,
    errors_encountered INTEGER DEFAULT 0,
    api_calls_made INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);