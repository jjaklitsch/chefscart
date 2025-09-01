-- Populate Shop Data
-- Run this after create-shop-tables.sql

-- Insert shop categories
INSERT INTO shop_categories (name, slug, description, sort_order, is_featured) VALUES
('Knives & Cutting Tools', 'knives-cutting-tools', 'Essential knives and cutting implements for food preparation', 1, true),
('Cookware & Pans', 'cookware-pans', 'Pots, pans, and essential cooking vessels', 2, true),
('Baking Essentials', 'baking-essentials', 'Tools and equipment for baking and pastry making', 3, true),
('Kitchen Appliances', 'kitchen-appliances', 'Electric and manual kitchen appliances', 4, true),
('Prep Tools & Gadgets', 'prep-tools-gadgets', 'Small tools and gadgets for food preparation', 5, false),
('Measuring & Mixing', 'measuring-mixing', 'Tools for measuring, mixing, and combining ingredients', 6, false),
('Serving & Presentation', 'serving-presentation', 'Tools for plating, serving, and presenting food', 7, false),
('Storage & Preservation', 'storage-preservation', 'Containers and tools for food storage', 8, false),
('Specialty Equipment', 'specialty-equipment', 'Specialized tools for specific cooking techniques', 9, false);

-- Insert cooking equipment
INSERT INTO cooking_equipment (name, display_name, slug, amazon_search_terms, popularity_score, is_essential, average_price_range) VALUES
-- Knives & Cutting Tools
('chefs knife', 'Chef''s Knife', 'chefs-knife', ARRAY['chef knife', 'kitchen knife', '8 inch chef knife'], 95, true, '$30-$150'),
('bread knife', 'Bread Knife', 'bread-knife', ARRAY['bread knife', 'serrated knife'], 70, false, '$20-$60'),
('fillet knife', 'Fillet Knife', 'fillet-knife', ARRAY['fillet knife', 'fish knife'], 40, false, '$25-$80'),
('butter knife', 'Butter Knife', 'butter-knife', ARRAY['butter knife', 'table knife'], 30, false, '$10-$30'),
('cheese knife', 'Cheese Knife', 'cheese-knife', ARRAY['cheese knife', 'cheese slicer'], 35, false, '$15-$50'),
('mincing knife', 'Mincing Knife', 'mincing-knife', ARRAY['mincing knife', 'herb knife'], 25, false, '$20-$60'),
('serrated knife', 'Serrated Knife', 'serrated-knife', ARRAY['serrated knife', 'tomato knife'], 60, false, '$15-$45'),
('knife', 'Kitchen Knife', 'kitchen-knife', ARRAY['kitchen knife', 'utility knife'], 85, true, '$20-$100'),
('cleaver', 'Cleaver', 'cleaver', ARRAY['meat cleaver', 'butcher knife'], 45, false, '$30-$100'),

-- Cookware & Pans
('frying pan', 'Frying Pan', 'frying-pan', ARRAY['frying pan', 'skillet', 'non-stick pan'], 95, true, '$25-$150'),
('pot', 'Pot', 'pot', ARRAY['cooking pot', 'stockpot', 'saucepan'], 90, true, '$20-$100'),
('sauce pan', 'Sauce Pan', 'sauce-pan', ARRAY['saucepan', 'small pot'], 80, true, '$25-$80'),
('wok', 'Wok', 'wok', ARRAY['wok', 'stir fry pan'], 60, false, '$30-$120'),
('dutch oven', 'Dutch Oven', 'dutch-oven', ARRAY['dutch oven', 'cast iron pot'], 75, false, '$50-$300'),
('grill pan', 'Grill Pan', 'grill-pan', ARRAY['grill pan', 'ridged pan'], 50, false, '$25-$80'),
('roasting pan', 'Roasting Pan', 'roasting-pan', ARRAY['roasting pan', 'roaster'], 65, false, '$30-$150'),
('casserole dish', 'Casserole Dish', 'casserole-dish', ARRAY['casserole dish', 'baking dish'], 70, false, '$20-$80'),
('glass casserole dish', 'Glass Casserole Dish', 'glass-casserole-dish', ARRAY['glass casserole dish', 'pyrex dish'], 60, false, '$25-$70'),
('tajine pot', 'Tajine Pot', 'tajine-pot', ARRAY['tagine pot', 'moroccan pot'], 20, false, '$40-$150'),
('double boiler', 'Double Boiler', 'double-boiler', ARRAY['double boiler', 'bain marie'], 30, false, '$25-$80'),
('springform pan', 'Springform Pan', 'springform-pan', ARRAY['springform pan', 'cheesecake pan'], 40, false, '$20-$60'),

-- Baking Essentials
('baking sheet', 'Baking Sheet', 'baking-sheet', ARRAY['baking sheet', 'cookie sheet'], 85, true, '$15-$50'),
('baking pan', 'Baking Pan', 'baking-pan', ARRAY['baking pan', 'cake pan'], 80, true, '$15-$60'),
('glass baking pan', 'Glass Baking Pan', 'glass-baking-pan', ARRAY['glass baking pan', 'pyrex baking dish'], 70, false, '$20-$60'),
('loaf pan', 'Loaf Pan', 'loaf-pan', ARRAY['loaf pan', 'bread pan'], 60, false, '$15-$40'),
('muffin tray', 'Muffin Tray', 'muffin-tray', ARRAY['muffin tin', 'cupcake pan'], 75, false, '$15-$50'),
('mini muffin tray', 'Mini Muffin Tray', 'mini-muffin-tray', ARRAY['mini muffin tin', 'mini cupcake pan'], 35, false, '$15-$35'),
('silicone muffin tray', 'Silicone Muffin Tray', 'silicone-muffin-tray', ARRAY['silicone muffin cups', 'silicone cupcake molds'], 45, false, '$15-$40'),
('silicone muffin liners', 'Silicone Muffin Liners', 'silicone-muffin-liners', ARRAY['silicone cupcake liners', 'reusable muffin cups'], 30, false, '$10-$25'),
('muffin liners', 'Muffin Liners', 'muffin-liners', ARRAY['cupcake liners', 'paper muffin cups'], 40, false, '$5-$15'),
('cake form', 'Cake Pan', 'cake-pan', ARRAY['cake pan', 'round cake pan'], 70, false, '$15-$50'),
('heart shaped cake form', 'Heart Shaped Cake Pan', 'heart-shaped-cake-pan', ARRAY['heart cake pan', 'heart shaped baking pan'], 20, false, '$15-$40'),
('pie form', 'Pie Pan', 'pie-pan', ARRAY['pie pan', 'pie dish'], 55, false, '$15-$45'),
('ceramic pie form', 'Ceramic Pie Pan', 'ceramic-pie-pan', ARRAY['ceramic pie dish', 'stoneware pie pan'], 35, false, '$20-$60'),
('tart form', 'Tart Pan', 'tart-pan', ARRAY['tart pan', 'tart tin'], 40, false, '$15-$50'),
('pizza pan', 'Pizza Pan', 'pizza-pan', ARRAY['pizza pan', 'pizza tray'], 50, false, '$15-$50'),
('pizza stone', 'Pizza Stone', 'pizza-stone', ARRAY['pizza stone', 'baking stone'], 45, false, '$20-$80'),

-- Kitchen Appliances
('stand mixer', 'Stand Mixer', 'stand-mixer', ARRAY['stand mixer', 'kitchenaid mixer'], 70, false, '$200-$600'),
('hand mixer', 'Hand Mixer', 'hand-mixer', ARRAY['hand mixer', 'electric mixer'], 65, false, '$25-$100'),
('food processor', 'Food Processor', 'food-processor', ARRAY['food processor', 'cuisinart food processor'], 75, false, '$50-$300'),
('blender', 'Blender', 'blender', ARRAY['blender', 'vitamix', 'ninja blender'], 80, false, '$50-$500'),
('immersion blender', 'Immersion Blender', 'immersion-blender', ARRAY['immersion blender', 'stick blender'], 70, false, '$25-$150'),
('slow cooker', 'Slow Cooker', 'slow-cooker', ARRAY['slow cooker', 'crock pot'], 65, false, '$30-$150'),
('pressure cooker', 'Pressure Cooker', 'pressure-cooker', ARRAY['pressure cooker', 'instant pot'], 60, false, '$50-$200'),
('instant pot', 'Instant Pot', 'instant-pot', ARRAY['instant pot', 'electric pressure cooker'], 75, false, '$80-$200'),
('rice cooker', 'Rice Cooker', 'rice-cooker', ARRAY['rice cooker', 'rice steamer'], 55, false, '$30-$150'),
('airfryer', 'Air Fryer', 'air-fryer', ARRAY['air fryer', 'air cooker'], 80, false, '$50-$300'),
('deep fryer', 'Deep Fryer', 'deep-fryer', ARRAY['deep fryer', 'electric fryer'], 40, false, '$50-$200'),
('toaster', 'Toaster', 'toaster', ARRAY['toaster', '2 slice toaster'], 60, false, '$25-$150'),
('waffle iron', 'Waffle Iron', 'waffle-iron', ARRAY['waffle maker', 'waffle iron'], 45, false, '$25-$100'),
('panini press', 'Panini Press', 'panini-press', ARRAY['panini press', 'sandwich maker'], 40, false, '$30-$120'),
('griddle', 'Griddle', 'griddle', ARRAY['electric griddle', 'flat top grill'], 35, false, '$50-$200'),
('dehydrator', 'Food Dehydrator', 'food-dehydrator', ARRAY['food dehydrator', 'fruit dehydrator'], 25, false, '$50-$200'),
('pasta machine', 'Pasta Machine', 'pasta-machine', ARRAY['pasta maker', 'pasta roller'], 30, false, '$30-$200'),
('bread machine', 'Bread Machine', 'bread-machine', ARRAY['bread maker', 'bread machine'], 35, false, '$80-$300'),
('ice cream machine', 'Ice Cream Machine', 'ice-cream-machine', ARRAY['ice cream maker', 'gelato maker'], 30, false, '$50-$400'),
('juicer', 'Juicer', 'juicer', ARRAY['juicer', 'juice extractor'], 40, false, '$50-$300'),
('popcorn maker', 'Popcorn Maker', 'popcorn-maker', ARRAY['popcorn maker', 'hot air popper'], 25, false, '$25-$100'),

-- Prep Tools & Gadgets
('cutting board', 'Cutting Board', 'cutting-board', ARRAY['cutting board', 'chopping board'], 95, true, '$15-$80'),
('peeler', 'Peeler', 'peeler', ARRAY['vegetable peeler', 'potato peeler'], 85, true, '$5-$20'),
('grater', 'Grater', 'grater', ARRAY['cheese grater', 'box grater'], 75, true, '$10-$40'),
('box grater', 'Box Grater', 'box-grater', ARRAY['4 sided grater', 'cheese grater'], 60, false, '$15-$50'),
('microplane', 'Microplane Grater', 'microplane-grater', ARRAY['microplane', 'zester grater'], 65, false, '$15-$40'),
('zester', 'Zester', 'zester', ARRAY['lemon zester', 'citrus zester'], 50, false, '$10-$30'),
('garlic press', 'Garlic Press', 'garlic-press', ARRAY['garlic press', 'garlic crusher'], 60, false, '$10-$30'),
('can opener', 'Can Opener', 'can-opener', ARRAY['can opener', 'manual can opener'], 70, false, '$10-$30'),
('bottle opener', 'Bottle Opener', 'bottle-opener', ARRAY['bottle opener', 'beer opener'], 50, false, '$5-$20'),
('corkscrew', 'Corkscrew', 'corkscrew', ARRAY['wine opener', 'corkscrew'], 45, false, '$10-$50'),
('pizza cutter', 'Pizza Cutter', 'pizza-cutter', ARRAY['pizza cutter', 'pizza wheel'], 55, false, '$10-$30'),
('apple cutter', 'Apple Cutter', 'apple-cutter', ARRAY['apple slicer', 'apple corer slicer'], 35, false, '$15-$40'),
('apple corer', 'Apple Corer', 'apple-corer', ARRAY['apple corer', 'fruit corer'], 30, false, '$10-$25'),
('cherry pitter', 'Cherry Pitter', 'cherry-pitter', ARRAY['cherry pitter', 'cherry pit remover'], 20, false, '$15-$40'),
('melon baller', 'Melon Baller', 'melon-baller', ARRAY['melon baller', 'ice cream scoop'], 25, false, '$10-$25'),
('egg slicer', 'Egg Slicer', 'egg-slicer', ARRAY['egg slicer', 'hard boiled egg slicer'], 30, false, '$10-$25'),
('potato masher', 'Potato Masher', 'potato-masher', ARRAY['potato masher', 'vegetable masher'], 55, false, '$10-$30'),
('potato ricer', 'Potato Ricer', 'potato-ricer', ARRAY['potato ricer', 'potato press'], 25, false, '$20-$60'),
('meat tenderizer', 'Meat Tenderizer', 'meat-tenderizer', ARRAY['meat tenderizer', 'meat hammer'], 35, false, '$15-$40'),
('meat grinder', 'Meat Grinder', 'meat-grinder', ARRAY['meat grinder', 'food grinder'], 30, false, '$50-$200'),
('butter curler', 'Butter Curler', 'butter-curler', ARRAY['butter curler', 'butter knife'], 15, false, '$10-$25'),
('lemon squeezer', 'Lemon Squeezer', 'lemon-squeezer', ARRAY['lemon juicer', 'citrus squeezer'], 40, false, '$10-$30'),
('mortar and pestle', 'Mortar and Pestle', 'mortar-and-pestle', ARRAY['mortar and pestle', 'spice grinder'], 45, false, '$20-$80'),
('pepper grinder', 'Pepper Grinder', 'pepper-grinder', ARRAY['pepper mill', 'spice grinder'], 50, false, '$15-$60'),
('mandoline', 'Mandoline Slicer', 'mandoline-slicer', ARRAY['mandoline slicer', 'vegetable slicer'], 40, false, '$30-$150'),
('kitchen scissors', 'Kitchen Scissors', 'kitchen-scissors', ARRAY['kitchen shears', 'cooking scissors'], 65, false, '$15-$50'),
('poultry shears', 'Poultry Shears', 'poultry-shears', ARRAY['kitchen shears', 'chicken scissors'], 35, false, '$20-$60');

-- Get category IDs for equipment assignment
WITH category_ids AS (
    SELECT id, slug FROM shop_categories
),
knives_id AS (SELECT id FROM category_ids WHERE slug = 'knives-cutting-tools'),
cookware_id AS (SELECT id FROM category_ids WHERE slug = 'cookware-pans'),
baking_id AS (SELECT id FROM category_ids WHERE slug = 'baking-essentials'),
appliances_id AS (SELECT id FROM category_ids WHERE slug = 'kitchen-appliances'),
prep_id AS (SELECT id FROM category_ids WHERE slug = 'prep-tools-gadgets')

-- Insert equipment-category relationships
INSERT INTO equipment_categories (equipment_id, category_id)
SELECT e.id, c.id
FROM cooking_equipment e
CROSS JOIN shop_categories c
WHERE 
    -- Knives & Cutting Tools
    (e.slug IN ('chefs-knife', 'bread-knife', 'fillet-knife', 'butter-knife', 'cheese-knife', 'mincing-knife', 'serrated-knife', 'kitchen-knife', 'cleaver') AND c.slug = 'knives-cutting-tools')
    OR
    -- Cookware & Pans  
    (e.slug IN ('frying-pan', 'pot', 'sauce-pan', 'wok', 'dutch-oven', 'grill-pan', 'roasting-pan', 'casserole-dish', 'glass-casserole-dish', 'tajine-pot', 'double-boiler', 'springform-pan') AND c.slug = 'cookware-pans')
    OR
    -- Baking Essentials
    (e.slug IN ('baking-sheet', 'baking-pan', 'glass-baking-pan', 'loaf-pan', 'muffin-tray', 'mini-muffin-tray', 'silicone-muffin-tray', 'silicone-muffin-liners', 'muffin-liners', 'cake-pan', 'heart-shaped-cake-pan', 'pie-pan', 'ceramic-pie-pan', 'tart-pan', 'pizza-pan', 'pizza-stone') AND c.slug = 'baking-essentials')
    OR
    -- Kitchen Appliances
    (e.slug IN ('stand-mixer', 'hand-mixer', 'food-processor', 'blender', 'immersion-blender', 'slow-cooker', 'pressure-cooker', 'instant-pot', 'rice-cooker', 'air-fryer', 'deep-fryer', 'toaster', 'waffle-iron', 'panini-press', 'griddle', 'food-dehydrator', 'pasta-machine', 'bread-machine', 'ice-cream-machine', 'juicer', 'popcorn-maker') AND c.slug = 'kitchen-appliances')
    OR
    -- Prep Tools & Gadgets
    (e.slug IN ('cutting-board', 'peeler', 'grater', 'box-grater', 'microplane-grater', 'zester', 'garlic-press', 'can-opener', 'bottle-opener', 'corkscrew', 'pizza-cutter', 'apple-cutter', 'apple-corer', 'cherry-pitter', 'melon-baller', 'egg-slicer', 'potato-masher', 'potato-ricer', 'meat-tenderizer', 'meat-grinder', 'butter-curler', 'lemon-squeezer', 'mortar-and-pestle', 'pepper-grinder', 'mandoline-slicer', 'kitchen-scissors', 'poultry-shears') AND c.slug = 'prep-tools-gadgets');

-- View the results
SELECT 
    c.name as category,
    COUNT(ec.equipment_id) as equipment_count
FROM shop_categories c
LEFT JOIN equipment_categories ec ON c.id = ec.category_id
GROUP BY c.id, c.name
ORDER BY c.sort_order;