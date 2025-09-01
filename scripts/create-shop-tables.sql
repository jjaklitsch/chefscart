-- Shop Database Schema Migration
-- Run this in Supabase Dashboard SQL Editor: https://supabase.com/dashboard/project/bcbpcuzjkuptyxinjchg/sql

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS equipment_categories CASCADE;
DROP TABLE IF EXISTS cooking_equipment CASCADE;
DROP TABLE IF EXISTS shop_categories CASCADE;

-- Shop categories table
CREATE TABLE shop_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cooking equipment table
CREATE TABLE cooking_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200) NOT NULL, -- Title case version for frontend
    slug VARCHAR(200) NOT NULL UNIQUE,
    amazon_search_terms TEXT[], -- Array of search terms for Amazon API
    description TEXT,
    image_url TEXT,
    popularity_score INTEGER DEFAULT 0, -- For sorting popular products
    is_essential BOOLEAN DEFAULT false, -- Mark essential cooking tools
    average_price_range VARCHAR(50), -- e.g., "$10-$25", "$50-$100"
    affiliate_url TEXT, -- Direct Amazon affiliate link if available
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for many-to-many relationship
CREATE TABLE equipment_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES cooking_equipment(id) ON DELETE CASCADE,
    category_id UUID REFERENCES shop_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(equipment_id, category_id)
);

-- Add indexes for better performance
CREATE INDEX idx_cooking_equipment_slug ON cooking_equipment(slug);
CREATE INDEX idx_cooking_equipment_popularity ON cooking_equipment(popularity_score DESC);
CREATE INDEX idx_shop_categories_slug ON shop_categories(slug);
CREATE INDEX idx_shop_categories_featured ON shop_categories(is_featured) WHERE is_featured = true;
CREATE INDEX idx_equipment_categories_equipment ON equipment_categories(equipment_id);
CREATE INDEX idx_equipment_categories_category ON equipment_categories(category_id);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_shop_categories_updated_at 
    BEFORE UPDATE ON shop_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cooking_equipment_updated_at 
    BEFORE UPDATE ON cooking_equipment 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (shop is public)
CREATE POLICY "Allow public read access to shop_categories" ON shop_categories
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to cooking_equipment" ON cooking_equipment
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to equipment_categories" ON equipment_categories
    FOR SELECT USING (true);

-- Admin policies for authenticated users with service role
CREATE POLICY "Allow admin full access to shop_categories" ON shop_categories
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow admin full access to cooking_equipment" ON cooking_equipment
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow admin full access to equipment_categories" ON equipment_categories
    FOR ALL USING (auth.role() = 'service_role');