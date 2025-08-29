-- Meals table schema for ChefsCart
-- This table stores the curated meal database for matching against user preferences

CREATE TABLE meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Basic meal information
    slug VARCHAR(255) NOT NULL UNIQUE, -- URL-friendly version of title
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Classification
    courses TEXT[] NOT NULL DEFAULT '{}', -- ['breakfast', 'lunch', 'dinner', 'snack']
    cuisines TEXT[] NOT NULL DEFAULT '{}', -- ['Mexican', 'American', 'Italian', etc.]
    diets_supported TEXT[] NOT NULL DEFAULT '{}', -- strict dietary compliance
    primary_ingredient VARCHAR(100) NOT NULL DEFAULT 'none', -- 'chicken', 'beef', 'pasta', 'beans', etc.
    ingredient_tags TEXT[] NOT NULL DEFAULT '{}', -- ['chicken', 'pasta', 'tomatoes', etc.] for favorite foods matching
    
    -- Cooking metadata
    spice_level INTEGER CHECK (spice_level >= 1 AND spice_level <= 5) DEFAULT 3,
    time_total_min INTEGER NOT NULL,
    servings_default INTEGER NOT NULL DEFAULT 2,
    servings_min INTEGER NOT NULL DEFAULT 1,
    servings_max INTEGER NOT NULL DEFAULT 8,
    cost_per_serving VARCHAR(10) NOT NULL DEFAULT '$' CHECK (cost_per_serving IN ('$', '$$', '$$$')),
    
    -- Dietary information
    allergens_present TEXT[] NOT NULL DEFAULT '{}', -- ['Dairy', 'Nuts', 'Gluten', etc.]
    search_keywords TEXT[] NOT NULL DEFAULT '{}', -- searchable tags
    
    -- Recipe data (stored as JSONB for flexibility)
    ingredients_json JSONB NOT NULL,
    instructions_json JSONB NOT NULL,
    
    -- Optional media
    image_url TEXT,
    
    -- Indexes for efficient querying
    CONSTRAINT meals_slug_check CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT meals_time_check CHECK (time_total_min > 0),
    CONSTRAINT meals_servings_check CHECK (servings_min <= servings_default AND servings_default <= servings_max)
);

-- Create indexes for fast querying based on user preferences
CREATE INDEX idx_meals_cuisines ON meals USING GIN (cuisines);
CREATE INDEX idx_meals_diets_supported ON meals USING GIN (diets_supported);
CREATE INDEX idx_meals_courses ON meals USING GIN (courses);
CREATE INDEX idx_meals_primary_ingredient ON meals (primary_ingredient);
CREATE INDEX idx_meals_spice_level ON meals (spice_level);
CREATE INDEX idx_meals_time_total_min ON meals (time_total_min);
CREATE INDEX idx_meals_allergens_present ON meals USING GIN (allergens_present);
CREATE INDEX idx_meals_search_keywords ON meals USING GIN (search_keywords);
CREATE INDEX idx_meals_ingredient_tags ON meals USING GIN (ingredient_tags);
CREATE INDEX idx_meals_slug ON meals (slug);

-- Full-text search index for meal discovery (skip for now due to immutability requirements)
-- CREATE INDEX idx_meals_fts ON meals USING GIN (
--     to_tsvector('english', title || ' ' || description || ' ' || array_to_string(search_keywords, ' '))
-- );

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meals_updated_at 
    BEFORE UPDATE ON meals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data validation function
CREATE OR REPLACE FUNCTION validate_meal_data(meal_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validate ingredients_json structure
    IF NOT (meal_data->'ingredients_json' ? 'servings' AND meal_data->'ingredients_json' ? 'ingredients') THEN
        RAISE EXCEPTION 'ingredients_json must contain servings and ingredients fields';
    END IF;
    
    -- Validate instructions_json structure  
    IF NOT (meal_data->'instructions_json' ? 'time_total_min' AND meal_data->'instructions_json' ? 'steps') THEN
        RAISE EXCEPTION 'instructions_json must contain time_total_min and steps fields';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (optional - uncomment if using RLS)
-- ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- Grant permissions (adjust based on your setup)
-- GRANT SELECT ON meals TO anon, authenticated;
-- GRANT ALL ON meals TO service_role;

COMMENT ON TABLE meals IS 'Curated meal database for matching against user preferences in ChefsCart onboarding flow';
COMMENT ON COLUMN meals.slug IS 'URL-friendly identifier derived from title';
COMMENT ON COLUMN meals.diets_supported IS 'Strict dietary compliance - only list if meal fully supports the diet';
COMMENT ON COLUMN meals.search_keywords IS 'Tags for matching user preferences and search';
COMMENT ON COLUMN meals.ingredients_json IS 'Complete ingredient list with quantities and nutritional data';
COMMENT ON COLUMN meals.instructions_json IS 'Step-by-step cooking instructions with timing';