-- Optimize ZIP code cache performance
-- Run these commands in Supabase SQL Editor

-- Create index on zip_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_zip_code_cache_zip_code ON zip_code_cache (zip_code);

-- Create index on retailers cache for faster retailer lookups  
CREATE INDEX IF NOT EXISTS idx_retailers_cache_zip_code ON retailers_cache (zip_code);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_zip_code_cache_coverage ON zip_code_cache (zip_code, has_instacart_coverage, last_updated);

-- Check existing indexes
SELECT 
    schemaname,
    tablename, 
    indexname, 
    indexdef
FROM pg_indexes 
WHERE tablename IN ('zip_code_cache', 'retailers_cache')
ORDER BY tablename, indexname;