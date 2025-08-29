-- Instacart API Cache Schema
-- This schema caches ZIP code validation and retailer data to reduce API calls

-- Table to cache ZIP code validation status
CREATE TABLE zip_code_cache (
    zip_code VARCHAR(5) PRIMARY KEY,
    is_valid BOOLEAN NOT NULL DEFAULT false,
    has_instacart_coverage BOOLEAN NOT NULL DEFAULT false,
    state VARCHAR(2),
    city VARCHAR(100),
    retailer_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_api_check TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    api_response_status INTEGER, -- HTTP status from last API call
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table to cache retailers for each ZIP code
CREATE TABLE retailers_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    zip_code VARCHAR(5) NOT NULL REFERENCES zip_code_cache(zip_code) ON DELETE CASCADE,
    retailer_key VARCHAR(255) NOT NULL,
    retailer_name VARCHAR(255) NOT NULL,
    retailer_logo_url TEXT,
    priority_score NUMERIC(3,1) DEFAULT 7, -- Our custom priority scoring (0 = highest priority)
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Unique constraint to prevent duplicates
    UNIQUE(zip_code, retailer_key)
);

-- Table to track batch job runs and status
CREATE TABLE instacart_sync_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL, -- 'full_refresh', 'incremental', 'validation_only'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE,
    zip_codes_processed INTEGER DEFAULT 0,
    zip_codes_total INTEGER DEFAULT 0,
    retailers_found INTEGER DEFAULT 0,
    errors_encountered INTEGER DEFAULT 0,
    api_calls_made INTEGER DEFAULT 0,
    error_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_zip_code_cache_has_coverage ON zip_code_cache(has_instacart_coverage);
CREATE INDEX idx_zip_code_cache_last_updated ON zip_code_cache(last_updated);
CREATE INDEX idx_retailers_cache_zip_code ON retailers_cache(zip_code);
CREATE INDEX idx_retailers_cache_priority ON retailers_cache(priority_score);
CREATE INDEX idx_retailers_cache_active ON retailers_cache(is_active);
CREATE INDEX idx_sync_jobs_status ON instacart_sync_jobs(status);
CREATE INDEX idx_sync_jobs_started_at ON instacart_sync_jobs(started_at DESC);

-- View for getting cached retailer data with priority sorting
CREATE VIEW zip_retailers_prioritized AS
SELECT 
    r.zip_code,
    r.retailer_key,
    r.retailer_name,
    r.retailer_logo_url,
    r.priority_score,
    z.has_instacart_coverage,
    z.last_updated as zip_last_updated,
    r.last_updated as retailer_last_updated
FROM retailers_cache r
JOIN zip_code_cache z ON r.zip_code = z.zip_code
WHERE r.is_active = true
ORDER BY r.zip_code, r.priority_score, r.retailer_name;

-- Function to check if cache data is stale (older than 30 days)
CREATE OR REPLACE FUNCTION is_cache_stale(last_updated_date TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN last_updated_date < (now() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- Function to get retailers for a ZIP code from cache
CREATE OR REPLACE FUNCTION get_cached_retailers(input_zip_code VARCHAR(5))
RETURNS TABLE(
    retailer_key VARCHAR(255),
    retailer_name VARCHAR(255), 
    retailer_logo_url TEXT,
    priority_score NUMERIC(3,1),
    cache_age_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.retailer_key,
        r.retailer_name,
        r.retailer_logo_url,
        r.priority_score,
        EXTRACT(DAYS FROM (now() - r.last_updated))::INTEGER as cache_age_days
    FROM retailers_cache r
    JOIN zip_code_cache z ON r.zip_code = z.zip_code
    WHERE r.zip_code = input_zip_code 
    AND r.is_active = true
    AND z.has_instacart_coverage = true
    ORDER BY r.priority_score, r.retailer_name;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE zip_code_cache IS 'Caches ZIP code validation results from Instacart API to reduce API calls';
COMMENT ON TABLE retailers_cache IS 'Stores available retailers per ZIP code with priority scoring';
COMMENT ON TABLE instacart_sync_jobs IS 'Tracks batch job execution for monitoring and debugging';
COMMENT ON COLUMN retailers_cache.priority_score IS 'Lower number = higher priority (0=Whole Foods, 1=Premium chains, etc.)';
COMMENT ON FUNCTION get_cached_retailers IS 'Returns prioritized retailer list for a ZIP code from cache';