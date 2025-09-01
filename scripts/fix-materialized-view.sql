-- Fix the materialized view to handle empty tables
-- Run this in Supabase SQL Editor

-- Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS category_products_cache;

-- Create a simpler materialized view that can handle empty tables
CREATE MATERIALIZED VIEW category_products_cache AS
SELECT 
    sc.id as category_id,
    sc.slug as category_slug,
    sc.name as category_name,
    ce.id as equipment_id,
    ce.display_name as equipment_name,
    ce.slug as equipment_slug,
    ce.popularity_score,
    COALESCE(ap.asin, '') as asin,
    COALESCE(ap.product_title, '') as product_title,
    COALESCE(ap.product_url, '') as product_url,
    COALESCE(ap.brand, '') as brand,
    COALESCE(ap.price, '') as price,
    COALESCE(ap.primary_image_url, '') as primary_image_url,
    COALESCE(ap.rating, 0) as rating,
    COALESCE(ap.review_count, 0) as review_count,
    COALESCE(ap.last_updated, NOW()) as last_updated,
    ROW_NUMBER() OVER (PARTITION BY ce.id ORDER BY COALESCE(ap.display_priority, 100), COALESCE(ap.popularity_rank, 100)) as product_rank
FROM shop_categories sc
JOIN equipment_categories ec ON sc.id = ec.category_id
JOIN cooking_equipment ce ON ec.equipment_id = ce.id
LEFT JOIN amazon_products ap ON ce.id = ap.equipment_id AND ap.is_active = true
ORDER BY sc.sort_order, ce.popularity_score DESC, product_rank;

-- Create index on materialized view
CREATE INDEX idx_category_products_cache_category ON category_products_cache(category_slug);
CREATE INDEX idx_category_products_cache_equipment ON category_products_cache(equipment_id);

-- Update the refresh function to be more robust
CREATE OR REPLACE FUNCTION refresh_product_cache()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY category_products_cache;
EXCEPTION WHEN OTHERS THEN
    -- If concurrent refresh fails, try regular refresh
    REFRESH MATERIALIZED VIEW category_products_cache;
END;
$$ LANGUAGE plpgsql;