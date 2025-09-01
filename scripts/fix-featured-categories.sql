-- Fix Featured Categories
-- Run this in Supabase SQL Editor

-- Make prep tools and measuring & mixing featured (as intended)
UPDATE shop_categories SET 
    is_featured = true,
    description = 'Versatile gadgets and tools that make food preparation faster and easier'
WHERE slug = 'prep-tools-gadgets';

UPDATE shop_categories SET 
    is_featured = true,
    description = 'Precise measuring tools, mixing bowls, and equipment for perfect recipes'
WHERE slug = 'measuring-mixing';

-- Also fix the sort orders to ensure proper display
UPDATE shop_categories SET sort_order = 5 WHERE slug = 'prep-tools-gadgets';
UPDATE shop_categories SET sort_order = 6 WHERE slug = 'measuring-mixing';

-- Check the results
SELECT name, is_featured, sort_order, description 
FROM shop_categories 
WHERE is_featured = true 
ORDER BY sort_order;