-- Improved Shop Categories Structure
-- This updates the existing categories with better organization

-- First, update existing categories to have better descriptions and visibility
UPDATE shop_categories SET 
    description = 'Essential knives, cutting boards, and cutting tools for efficient meal preparation',
    is_featured = true,
    sort_order = 1
WHERE slug = 'knives-cutting-tools';

UPDATE shop_categories SET 
    description = 'High-quality pots, pans, skillets, and cookware for all cooking methods',
    is_featured = true,
    sort_order = 2
WHERE slug = 'cookware-pans';

UPDATE shop_categories SET 
    description = 'Baking sheets, pans, molds, and specialty tools for perfect baking results',
    is_featured = true,
    sort_order = 3
WHERE slug = 'baking-essentials';

UPDATE shop_categories SET 
    description = 'Time-saving electric and manual appliances for modern kitchens',
    is_featured = true,
    sort_order = 4
WHERE slug = 'kitchen-appliances';

-- Make prep tools featured and improve description
UPDATE shop_categories SET 
    description = 'Versatile gadgets and tools that make food preparation faster and easier',
    is_featured = true,
    sort_order = 5
WHERE slug = 'prep-tools-gadgets';

-- Make measuring & mixing featured 
UPDATE shop_categories SET 
    description = 'Precise measuring tools, mixing bowls, and equipment for perfect recipes',
    is_featured = true,
    sort_order = 6
WHERE slug = 'measuring-mixing';

-- Keep serving & presentation but improve description
UPDATE shop_categories SET 
    description = 'Elegant serving dishes, platters, and presentation tools for impressive meals',
    is_featured = false,
    sort_order = 7
WHERE slug = 'serving-presentation';

-- Keep storage but improve description
UPDATE shop_categories SET 
    description = 'Food storage containers, vacuum sealers, and preservation tools',
    is_featured = false,
    sort_order = 8
WHERE slug = 'storage-preservation';

-- Keep specialty but improve description  
UPDATE shop_categories SET 
    description = 'Specialized tools for advanced techniques like sous vide, fermentation, and more',
    is_featured = false,
    sort_order = 9
WHERE slug = 'specialty-equipment';

-- Add some missing equipment to measuring & mixing category
INSERT INTO cooking_equipment (name, display_name, slug, amazon_search_terms, popularity_score, is_essential, average_price_range) VALUES
('mixing bowl set', 'Mixing Bowl Set', 'mixing-bowl-set', ARRAY['mixing bowl set', 'nesting bowls'], 85, true, '$25-$80'),
('measuring cup set', 'Measuring Cup Set', 'measuring-cup-set', ARRAY['measuring cups', 'dry measuring cups'], 90, true, '$15-$40'),
('measuring spoon set', 'Measuring Spoon Set', 'measuring-spoon-set', ARRAY['measuring spoons', 'teaspoon set'], 80, true, '$10-$30'),
('liquid measuring cup', 'Liquid Measuring Cup', 'liquid-measuring-cup', ARRAY['liquid measuring cup', 'glass measuring cup'], 75, true, '$15-$45'),
('kitchen scale', 'Kitchen Scale', 'kitchen-scale', ARRAY['digital kitchen scale', 'food scale'], 70, false, '$20-$100'),
('whisk', 'Whisk', 'whisk', ARRAY['wire whisk', 'balloon whisk'], 85, true, '$10-$30'),
('wooden spoon set', 'Wooden Spoon Set', 'wooden-spoon-set', ARRAY['wooden spoons', 'cooking utensil set'], 75, true, '$15-$40'),
('rubber spatula set', 'Rubber Spatula Set', 'rubber-spatula-set', ARRAY['silicone spatula', 'flexible spatula'], 80, true, '$15-$35')
ON CONFLICT (slug) DO NOTHING;

-- Connect new equipment to measuring & mixing category
INSERT INTO equipment_categories (equipment_id, category_id)
SELECT e.id, c.id
FROM cooking_equipment e
CROSS JOIN shop_categories c
WHERE e.slug IN ('mixing-bowl-set', 'measuring-cup-set', 'measuring-spoon-set', 'liquid-measuring-cup', 'kitchen-scale', 'whisk', 'wooden-spoon-set', 'rubber-spatula-set')
AND c.slug = 'measuring-mixing'
ON CONFLICT (equipment_id, category_id) DO NOTHING;

-- View the updated categories
SELECT 
    c.name as category,
    c.is_featured,
    c.sort_order,
    COUNT(ec.equipment_id) as equipment_count
FROM shop_categories c
LEFT JOIN equipment_categories ec ON c.id = ec.category_id
GROUP BY c.id, c.name, c.is_featured, c.sort_order
ORDER BY c.sort_order;