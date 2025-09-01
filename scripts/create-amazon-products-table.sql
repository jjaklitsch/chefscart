-- Amazon Products Cache Table
-- Run this in Supabase Dashboard SQL Editor: https://supabase.com/dashboard/project/bcbpcuzjkuptyxinjchg/sql

-- Drop existing table if it exists
DROP TABLE IF EXISTS amazon_products CASCADE;

-- Create amazon_products table for caching product data
CREATE TABLE amazon_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asin VARCHAR(20) NOT NULL UNIQUE, -- Amazon Standard Identification Number
    equipment_id UUID REFERENCES cooking_equipment(id) ON DELETE CASCADE,
    search_term VARCHAR(200) NOT NULL, -- The search term used to find this product
    
    -- Product Details
    product_title TEXT NOT NULL,
    product_url TEXT NOT NULL,
    brand VARCHAR(200),
    price VARCHAR(50), -- Stored as string to preserve formatting
    original_price VARCHAR(50), -- Original price if on sale
    currency VARCHAR(10) DEFAULT 'USD',
    in_stock BOOLEAN DEFAULT true,
    
    -- Images
    primary_image_url TEXT,
    additional_image_urls TEXT[], -- Array of additional product images
    
    -- Ratings
    rating DECIMAL(2,1), -- e.g., 4.5
    review_count INTEGER,
    
    -- Product Features
    features TEXT[], -- Array of product features/bullet points
    description TEXT,
    
    -- Categories
    amazon_categories TEXT[], -- Array of Amazon category breadcrumbs
    
    -- Metadata
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    update_count INTEGER DEFAULT 1, -- Track how many times updated
    is_featured BOOLEAN DEFAULT false, -- Manually curated featured products
    popularity_rank INTEGER, -- Rank within search results (1 = most popular)
    
    -- Search/Display
    display_priority INTEGER DEFAULT 100, -- Lower number = higher priority
    is_active BOOLEAN DEFAULT true, -- Can be used to hide products
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_amazon_products_asin ON amazon_products(asin);
CREATE INDEX idx_amazon_products_equipment ON amazon_products(equipment_id);
CREATE INDEX idx_amazon_products_search_term ON amazon_products(search_term);
CREATE INDEX idx_amazon_products_last_updated ON amazon_products(last_updated);
CREATE INDEX idx_amazon_products_featured ON amazon_products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_amazon_products_active ON amazon_products(is_active) WHERE is_active = true;
CREATE INDEX idx_amazon_products_priority ON amazon_products(display_priority, popularity_rank);

-- Enable Row Level Security
ALTER TABLE amazon_products ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access to amazon_products" ON amazon_products
    FOR SELECT USING (is_active = true);

-- Admin policies for service role
CREATE POLICY "Allow admin full access to amazon_products" ON amazon_products
    FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE TRIGGER update_amazon_products_updated_at 
    BEFORE UPDATE ON amazon_products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for featured products per equipment
CREATE OR REPLACE VIEW featured_equipment_products AS
SELECT 
    ap.*,
    ce.display_name as equipment_name,
    ce.slug as equipment_slug
FROM amazon_products ap
JOIN cooking_equipment ce ON ap.equipment_id = ce.id
WHERE ap.is_featured = true AND ap.is_active = true
ORDER BY ap.display_priority, ap.popularity_rank;

-- Create a materialized view for category page products (for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS category_products_cache AS
SELECT 
    sc.id as category_id,
    sc.slug as category_slug,
    sc.name as category_name,
    ce.id as equipment_id,
    ce.display_name as equipment_name,
    ce.slug as equipment_slug,
    ce.popularity_score,
    ap.asin,
    ap.product_title,
    ap.product_url,
    ap.brand,
    ap.price,
    ap.primary_image_url,
    ap.rating,
    ap.review_count,
    ap.last_updated,
    ROW_NUMBER() OVER (PARTITION BY ce.id ORDER BY ap.display_priority, ap.popularity_rank) as product_rank
FROM shop_categories sc
JOIN equipment_categories ec ON sc.id = ec.category_id
JOIN cooking_equipment ce ON ec.equipment_id = ce.id
LEFT JOIN amazon_products ap ON ce.id = ap.equipment_id AND ap.is_active = true
WHERE ap.id IS NOT NULL
ORDER BY sc.sort_order, ce.popularity_score DESC, product_rank;

-- Create index on materialized view
CREATE INDEX idx_category_products_cache_category ON category_products_cache(category_slug);
CREATE INDEX idx_category_products_cache_equipment ON category_products_cache(equipment_id);

-- Function to refresh product data (can be called by cron job)
CREATE OR REPLACE FUNCTION refresh_product_cache()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY category_products_cache;
END;
$$ LANGUAGE plpgsql;