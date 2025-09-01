-- Check if shop tables exist and have data
-- Run this in Supabase SQL Editor to diagnose the issue

-- Check if tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name IN ('shop_categories', 'cooking_equipment', 'equipment_categories', 'amazon_products')
AND table_schema = 'public';

-- Check data in existing tables
SELECT 'shop_categories' as table_name, count(*) as row_count FROM shop_categories
UNION ALL
SELECT 'cooking_equipment' as table_name, count(*) as row_count FROM cooking_equipment
UNION ALL  
SELECT 'equipment_categories' as table_name, count(*) as row_count FROM equipment_categories
UNION ALL
SELECT 'amazon_products' as table_name, count(*) as row_count FROM amazon_products;

-- Check if we have featured categories
SELECT name, slug, is_featured, sort_order 
FROM shop_categories 
WHERE is_featured = true 
ORDER BY sort_order;

-- Check if we have essential equipment
SELECT display_name, is_essential, popularity_score 
FROM cooking_equipment 
WHERE is_essential = true 
ORDER BY popularity_score DESC 
LIMIT 10;