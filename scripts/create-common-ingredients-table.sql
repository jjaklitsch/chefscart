-- Common Ingredients Reference Table
-- This table stores standardized ingredient information for consistent meal generation

CREATE TABLE IF NOT EXISTS common_ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE, -- Standardized ingredient name
    category VARCHAR(100) NOT NULL, -- Category for shopping/organization
    default_unit VARCHAR(50) NOT NULL, -- Standard unit of measure (pound, each, fl oz, etc.)
    organic_supported BOOLEAN DEFAULT true, -- Whether this ingredient can be bought organic
    aliases TEXT[], -- Alternative names/variations (replaces CSV variations)
    typical_brands TEXT[], -- Common brand suggestions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_common_ingredients_name ON common_ingredients(name);
CREATE INDEX IF NOT EXISTS idx_common_ingredients_category ON common_ingredients(category);
CREATE INDEX IF NOT EXISTS idx_common_ingredients_aliases ON common_ingredients USING GIN(aliases);

-- Insert core ingredients with proper categorization and units
INSERT INTO common_ingredients (name, category, default_unit, organic_supported, aliases, typical_brands) VALUES
-- Proteins (should use 'pound' as default unit)
('Cod', 'Seafood', 'pound', false, ARRAY['cod fillets', 'cod fish', 'white fish'], ARRAY['Wild Planet', 'Whole Foods', 'Fresh']),
('Salmon', 'Seafood', 'pound', true, ARRAY['salmon fillets', 'atlantic salmon'], ARRAY['Wild Planet', 'Whole Foods', 'Fresh']),
('Prawns', 'Seafood', 'pound', false, ARRAY['shrimp', 'jumbo prawns', 'large prawns'], ARRAY['Wild Planet', 'Whole Foods', 'Fresh']),
('Chicken Breast', 'Meat & Poultry', 'pound', true, ARRAY['chicken breasts', 'boneless chicken'], ARRAY['Bell & Evans', 'Perdue', 'Organic Valley']),
('Ground Beef', 'Meat & Poultry', 'pound', true, ARRAY['ground chuck', 'beef mince'], ARRAY['Grass Run Farms', 'Organic Valley', 'Local']),
('Pork Ribs', 'Meat & Poultry', 'pound', true, ARRAY['baby back ribs', 'spare ribs'], ARRAY['Niman Ranch', 'Local', 'Organic Valley']),
('Tofu', 'Gourmet', 'package', true, ARRAY['firm tofu', 'extra firm tofu'], ARRAY['Nasoya', 'House Foods', 'Mori-Nu']),

-- Grains & Starches
('Jasmine Rice', 'Rice & Grains', 'pound', true, ARRAY['white rice', 'thai jasmine rice'], ARRAY['Lundberg', 'Royal', 'Mahatma']),
('Brown Rice', 'Rice & Grains', 'pound', true, ARRAY['long grain brown rice'], ARRAY['Lundberg', 'Uncle Ben''s', 'Mahatma']),
('Quinoa', 'Rice & Grains', 'pound', true, ARRAY['tri-color quinoa', 'red quinoa'], ARRAY['Ancient Harvest', 'Bob''s Red Mill', 'Lundberg']),
('Pasta', 'Rice & Grains', 'package', true, ARRAY['spaghetti', 'penne', 'linguine'], ARRAY['Barilla', 'De Cecco', 'Rao''s']),

-- Vegetables 
('Yellow Onion', 'Produce', 'each', true, ARRAY['onions', 'cooking onion'], ARRAY['Local', 'Dole', 'Taylor Farms']),
('Garlic', 'Produce', 'head', true, ARRAY['fresh garlic', 'garlic bulbs'], ARRAY['Christopher Ranch', 'Local', 'Organic']),
('Tomatoes', 'Produce', 'pound', true, ARRAY['fresh tomatoes', 'beefsteak tomatoes'], ARRAY['Local', 'NatureSweet', 'Organic']),
('Spinach', 'Produce', 'package', true, ARRAY['baby spinach', 'fresh spinach'], ARRAY['Earthbound Farm', 'Organic Girl', 'Fresh Express']),
('Bell Peppers', 'Produce', 'each', true, ARRAY['red bell pepper', 'green bell pepper'], ARRAY['Local', 'NatureSweet', 'Organic']),

-- Pantry Staples
('Extra-Virgin Olive Oil', 'Spices, Seasonings, & Oils', 'fl oz', true, ARRAY['olive oil', 'EVOO'], ARRAY['Colavita', 'California Olive Ranch', 'Bertolli']),
('Coconut Milk', 'Canned Goods', 'can', false, ARRAY['canned coconut milk', 'full-fat coconut milk'], ARRAY['Thai Kitchen', 'Aroy-D', 'Chaokoh']),
('Vegetable Broth', 'Canned Goods', 'can', true, ARRAY['veggie broth', 'vegetable stock'], ARRAY['Pacific Foods', 'Imagine', 'Swanson']),
('Soy Sauce', 'Condiments & Sauces', 'fl oz', false, ARRAY['low sodium soy sauce'], ARRAY['Kikkoman', 'San-J', 'La Choy']),

-- Spices & Seasonings
('Kosher Salt', 'Spices, Seasonings, & Oils', 'ounce', false, ARRAY['salt', 'table salt'], ARRAY['Morton', 'Diamond Crystal']),
('Black Pepper', 'Spices, Seasonings, & Oils', 'ounce', true, ARRAY['ground black pepper'], ARRAY['McCormick', 'Simply Organic']),
('Cumin', 'Spices, Seasonings, & Oils', 'ounce', true, ARRAY['ground cumin'], ARRAY['McCormick', 'Frontier Co-op', 'Simply Organic']),
('Paprika', 'Spices, Seasonings, & Oils', 'ounce', true, ARRAY['smoked paprika', 'sweet paprika'], ARRAY['McCormick', 'Spice Islands', 'Simply Organic']),

-- Dairy
('Parmesan Cheese', 'Dairy & Eggs', 'ounce', true, ARRAY['parmigiano-reggiano', 'grated parmesan'], ARRAY['BelGioioso', 'Parmigiano-Reggiano', 'Kraft']),
('Ricotta Cheese', 'Dairy & Eggs', 'package', true, ARRAY['whole milk ricotta'], ARRAY['Calabro', 'Sargento', 'Organic Valley']),
('Large Eggs', 'Dairy & Eggs', 'dozen', true, ARRAY['eggs', 'chicken eggs'], ARRAY['Vital Farms', 'Organic Valley', 'Eggland''s Best'])

ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    default_unit = EXCLUDED.default_unit,
    organic_supported = EXCLUDED.organic_supported,
    aliases = EXCLUDED.aliases,
    typical_brands = EXCLUDED.typical_brands,
    updated_at = NOW();

-- Create a function to find ingredient by name or alias
CREATE OR REPLACE FUNCTION find_ingredient(search_name TEXT)
RETURNS common_ingredients AS $$
DECLARE
    result common_ingredients%ROWTYPE;
BEGIN
    -- First try exact match on name
    SELECT * INTO result FROM common_ingredients 
    WHERE LOWER(name) = LOWER(search_name);
    
    IF FOUND THEN
        RETURN result;
    END IF;
    
    -- Then try alias match
    SELECT * INTO result FROM common_ingredients 
    WHERE search_name = ANY(aliases) OR LOWER(search_name) = ANY(SELECT LOWER(unnest(aliases)));
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;