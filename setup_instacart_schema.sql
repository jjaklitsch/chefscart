
-- Create ingredient categories lookup table
CREATE TABLE IF NOT EXISTS ingredient_categories (
  id SERIAL PRIMARY KEY,
  category_name TEXT UNIQUE NOT NULL,
  display_order INTEGER NOT NULL,
  store_section TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert our optimized categories
INSERT INTO ingredient_categories (category_name, display_order, store_section, description) VALUES
-- Produce Section
('Fresh Produce', 1, 'Produce', 'Fresh fruits and vegetables'),
('Fresh Herbs', 2, 'Produce', 'Fresh basil, cilantro, parsley, etc.'),

-- Meat & Dairy Section  
('Meat & Poultry', 3, 'Meat & Dairy', 'Beef, chicken, turkey, pork'),
('Seafood', 4, 'Meat & Dairy', 'Fish, shellfish, and seafood'),
('Dairy & Eggs', 5, 'Meat & Dairy', 'Milk, cheese, yogurt, eggs'),

-- Pantry Section
('Grains & Rice', 6, 'Pantry', 'Rice, quinoa, barley, farro'),
('Pasta & Noodles', 7, 'Pantry', 'All pasta and noodle varieties'),
('Canned Goods', 8, 'Pantry', 'Canned vegetables, beans, tomatoes'),
('Condiments & Sauces', 9, 'Pantry', 'Soy sauce, vinegar, hot sauce'),
('Oils & Vinegars', 10, 'Pantry', 'Cooking oils and vinegars'),
('Spices & Seasonings', 11, 'Pantry', 'Dried spices and herb blends'),
('Baking & Pantry Staples', 12, 'Pantry', 'Flour, sugar, baking powder'),
('Nuts & Seeds', 13, 'Pantry', 'Almonds, walnuts, sesame seeds'),

-- Frozen & Other
('Frozen Foods', 14, 'Frozen', 'Frozen vegetables, fruits, meals'),
('Bread & Bakery', 15, 'Bakery', 'Bread, tortillas, pita'),
('International', 16, 'International', 'Specialty international ingredients')
ON CONFLICT (category_name) DO NOTHING;

-- Create health filters mapping table
CREATE TABLE IF NOT EXISTS health_filter_mapping (
  id SERIAL PRIMARY KEY,
  chefscart_preference TEXT NOT NULL,
  instacart_filter TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert known Instacart health filters
INSERT INTO health_filter_mapping (chefscart_preference, instacart_filter, description) VALUES
('organic', 'Organic', 'Certified organic products'),
('gluten-free', 'Gluten Free', 'Gluten-free certified products'),
('dairy-free', 'Dairy Free', 'Products without dairy ingredients'),
('vegan', 'Vegan', 'Plant-based products only'),
('vegetarian', 'Vegetarian', 'Vegetarian-friendly products'),
('keto', 'Keto', 'Keto diet compatible'),
('low-sodium', 'Low Sodium', 'Reduced sodium content'),
('sugar-free', 'Sugar Free', 'Products without added sugar'),
('high-protein', 'High Protein', 'High protein content'),
('heart-healthy', 'Heart Healthy', 'Heart-healthy options'),
('grass-fed', 'Grass Fed', 'Grass-fed meat and dairy'),
('wild-caught', 'Wild Caught', 'Wild-caught seafood'),
('pasture-raised', 'Pasture Raised', 'Pasture-raised animal products'),
('non-gmo', 'Non-GMO', 'Non-GMO verified products')
ON CONFLICT DO NOTHING;

-- Create user retailer preferences table
CREATE TABLE IF NOT EXISTS user_retailer_preferences (
  id SERIAL PRIMARY KEY,
  user_session TEXT,
  zip_code TEXT NOT NULL,
  retailer_key TEXT NOT NULL,
  retailer_name TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  last_used TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_retailer_prefs_session_zip ON user_retailer_preferences(user_session, zip_code);

