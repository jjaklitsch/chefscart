-- Migration script for existing user_profiles table
-- This adds missing social features to existing structure

-- First, let's add missing columns to user_profiles if they don't exist
DO $$ 
BEGIN
    -- Add username column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN username VARCHAR(50);
        -- We'll populate this later with a migration script
    END IF;

    -- Add display_name if missing  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'display_name'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN display_name VARCHAR(100);
    END IF;

    -- Add social profile fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'bio'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN bio TEXT;
        ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
        ALTER TABLE user_profiles ADD COLUMN cover_image_url TEXT;
        ALTER TABLE user_profiles ADD COLUMN location VARCHAR(100);
        ALTER TABLE user_profiles ADD COLUMN website_url TEXT;
    END IF;

    -- Add social stats
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'follower_count'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN follower_count INTEGER DEFAULT 0;
        ALTER TABLE user_profiles ADD COLUMN following_count INTEGER DEFAULT 0;
        ALTER TABLE user_profiles ADD COLUMN recipe_count INTEGER DEFAULT 0;
        ALTER TABLE user_profiles ADD COLUMN total_likes_received INTEGER DEFAULT 0;
    END IF;

    -- Add profile settings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'is_public'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
        ALTER TABLE user_profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add zip_code if missing (for ChefCart compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'zip_code'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN zip_code VARCHAR(10);
    END IF;

    -- Add preferences if missing (for ChefCart compatibility)  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'preferences'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN preferences JSONB;
    END IF;

    -- Add onboarding tracking if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'completed_onboarding'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN completed_onboarding BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create remaining social tables only if they don't exist

-- User-generated recipes
CREATE TABLE IF NOT EXISTS user_recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Author info
    author_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Recipe content
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    story TEXT, -- Personal story behind the recipe
    
    -- Media (images only)
    image_urls TEXT[] DEFAULT '{}',
    
    -- Recipe data (similar to existing meals table)
    cuisines TEXT[] DEFAULT '{}',
    courses TEXT[] DEFAULT '{}',
    diets_supported TEXT[] DEFAULT '{}',
    allergens_present TEXT[] DEFAULT '{}',
    ingredient_tags TEXT[] DEFAULT '{}',
    
    -- Cooking info
    prep_time INTEGER,
    cook_time INTEGER,
    total_time INTEGER,
    servings_default INTEGER DEFAULT 4,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'challenging')),
    spice_level INTEGER CHECK (spice_level BETWEEN 1 AND 5) DEFAULT 3,
    cost_estimate VARCHAR(10) CHECK (cost_estimate IN ('$', '$$', '$$$')) DEFAULT '$',
    
    -- Recipe content (JSONB for flexibility like existing meals table)
    ingredients_json JSONB NOT NULL,
    instructions_json JSONB NOT NULL,
    tips_json JSONB, -- cooking tips and variations
    nutrition_json JSONB, -- nutritional information
    
    -- Social metrics (updated via triggers)
    like_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Moderation
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'flagged')),
    featured_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(author_id, slug),
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT recipe_time_check CHECK (
        (prep_time IS NULL OR prep_time >= 0) AND 
        (cook_time IS NULL OR cook_time >= 0) AND
        (total_time IS NULL OR total_time >= 0)
    )
);

-- Following system
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Recipe interactions (likes, saves, views)
CREATE TABLE IF NOT EXISTS recipe_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES user_recipes(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) CHECK (interaction_type IN ('like', 'save', 'view')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, recipe_id, interaction_type)
);

-- Comments and reviews
CREATE TABLE IF NOT EXISTS recipe_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    recipe_id UUID REFERENCES user_recipes(id) ON DELETE CASCADE,
    author_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES recipe_comments(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- optional star rating
    images TEXT[] DEFAULT '{}', -- photos of their cooking attempt
    
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'flagged', 'deleted')),
    
    CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Recipe collections/cookbooks
CREATE TABLE IF NOT EXISTS recipe_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    owner_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    recipe_count INTEGER DEFAULT 0, -- updated via triggers
    
    CONSTRAINT collection_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Join table for recipes in collections
CREATE TABLE IF NOT EXISTS collection_recipes (
    collection_id UUID REFERENCES recipe_collections(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES user_recipes(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    PRIMARY KEY (collection_id, recipe_id)
);

-- Add constraints and indexes for user_profiles after column additions
DO $$
BEGIN
    -- Add username constraints if username column exists and constraints don't exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'username'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'user_profiles' AND constraint_name = 'username_format'
    ) THEN
        -- Make username unique if not already
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username_unique ON user_profiles(username);
        
        -- Add format constraint (will need to populate usernames first)
        -- ALTER TABLE user_profiles ADD CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$');
        -- ALTER TABLE user_profiles ADD CONSTRAINT username_not_reserved CHECK (username NOT IN ('admin', 'api', 'www', 'app', 'support', 'help', 'about', 'chefscart', 'official'));
    END IF;
END $$;

-- Create indexes for optimal performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles (username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles (created_at);

CREATE INDEX IF NOT EXISTS idx_user_recipes_author_id ON user_recipes (author_id);
CREATE INDEX IF NOT EXISTS idx_user_recipes_slug ON user_recipes (author_id, slug);
CREATE INDEX IF NOT EXISTS idx_user_recipes_status ON user_recipes (status);
CREATE INDEX IF NOT EXISTS idx_user_recipes_created_at ON user_recipes (created_at);
CREATE INDEX IF NOT EXISTS idx_user_recipes_featured_at ON user_recipes (featured_at) WHERE featured_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_recipes_cuisines ON user_recipes USING GIN (cuisines);
CREATE INDEX IF NOT EXISTS idx_user_recipes_courses ON user_recipes USING GIN (courses);
CREATE INDEX IF NOT EXISTS idx_user_recipes_diets_supported ON user_recipes USING GIN (diets_supported);
CREATE INDEX IF NOT EXISTS idx_user_recipes_ingredient_tags ON user_recipes USING GIN (ingredient_tags);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows (following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON user_follows (created_at);

CREATE INDEX IF NOT EXISTS idx_recipe_interactions_recipe ON recipe_interactions (recipe_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_recipe_interactions_user ON recipe_interactions (user_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_recipe_interactions_created_at ON recipe_interactions (created_at);

CREATE INDEX IF NOT EXISTS idx_recipe_comments_recipe ON recipe_comments (recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_author ON recipe_comments (author_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_parent ON recipe_comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipe_comments_created_at ON recipe_comments (created_at);

CREATE INDEX IF NOT EXISTS idx_recipe_collections_owner ON recipe_collections (owner_id);
CREATE INDEX IF NOT EXISTS idx_recipe_collections_public ON recipe_collections (is_public) WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_collection_recipes_collection ON collection_recipes (collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_recipe ON collection_recipes (recipe_id);

-- Note: Trigger functions and RLS policies will be added in separate scripts
-- after we verify the table structure is correct

COMMENT ON TABLE user_profiles IS 'Extended user profiles with social features for ChefCart cooking platform';
COMMENT ON TABLE user_recipes IS 'User-generated recipes with social metrics and engagement tracking';
COMMENT ON TABLE user_follows IS 'Following relationships between users';
COMMENT ON TABLE recipe_interactions IS 'User interactions with recipes (likes, saves, views)';
COMMENT ON TABLE recipe_comments IS 'Comments and reviews on recipes with nested reply support';
COMMENT ON TABLE recipe_collections IS 'User-created collections/cookbooks of recipes';
COMMENT ON TABLE collection_recipes IS 'Join table linking recipes to collections';