-- Social Cooking Platform Database Schema
-- Phase 1: Core social features for ChefCart transformation

-- Enhanced user profiles for social features
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Basic profile info
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    cover_image_url TEXT,
    location VARCHAR(100),
    website_url TEXT,
    
    -- Social stats (updated via triggers)
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    recipe_count INTEGER DEFAULT 0,
    total_likes_received INTEGER DEFAULT 0,
    
    -- Profile settings
    is_public BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Existing ChefCart compatibility
    zip_code VARCHAR(10),
    preferences JSONB,
    completed_onboarding BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$'),
    CONSTRAINT username_not_reserved CHECK (username NOT IN ('admin', 'api', 'www', 'app', 'support', 'help', 'about', 'chefscart', 'official'))
);

-- User-generated recipes (extends existing meals structure)
CREATE TABLE user_recipes (
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
    
    -- Media
    image_urls TEXT[] DEFAULT '{}',
    video_url TEXT,
    
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
CREATE TABLE user_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Recipe interactions (likes, saves, views)
CREATE TABLE recipe_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES user_recipes(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) CHECK (interaction_type IN ('like', 'save', 'view')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, recipe_id, interaction_type)
);

-- Comments and reviews
CREATE TABLE recipe_comments (
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
CREATE TABLE recipe_collections (
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
CREATE TABLE collection_recipes (
    collection_id UUID REFERENCES recipe_collections(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES user_recipes(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    PRIMARY KEY (collection_id, recipe_id)
);

-- Indexes for optimal performance
CREATE INDEX idx_user_profiles_username ON user_profiles (username);
CREATE INDEX idx_user_profiles_created_at ON user_profiles (created_at);

CREATE INDEX idx_user_recipes_author_id ON user_recipes (author_id);
CREATE INDEX idx_user_recipes_slug ON user_recipes (author_id, slug);
CREATE INDEX idx_user_recipes_status ON user_recipes (status);
CREATE INDEX idx_user_recipes_created_at ON user_recipes (created_at);
CREATE INDEX idx_user_recipes_featured_at ON user_recipes (featured_at) WHERE featured_at IS NOT NULL;
CREATE INDEX idx_user_recipes_cuisines ON user_recipes USING GIN (cuisines);
CREATE INDEX idx_user_recipes_courses ON user_recipes USING GIN (courses);
CREATE INDEX idx_user_recipes_diets_supported ON user_recipes USING GIN (diets_supported);
CREATE INDEX idx_user_recipes_ingredient_tags ON user_recipes USING GIN (ingredient_tags);

CREATE INDEX idx_user_follows_follower ON user_follows (follower_id);
CREATE INDEX idx_user_follows_following ON user_follows (following_id);
CREATE INDEX idx_user_follows_created_at ON user_follows (created_at);

CREATE INDEX idx_recipe_interactions_recipe ON recipe_interactions (recipe_id, interaction_type);
CREATE INDEX idx_recipe_interactions_user ON recipe_interactions (user_id, interaction_type);
CREATE INDEX idx_recipe_interactions_created_at ON recipe_interactions (created_at);

CREATE INDEX idx_recipe_comments_recipe ON recipe_comments (recipe_id);
CREATE INDEX idx_recipe_comments_author ON recipe_comments (author_id);
CREATE INDEX idx_recipe_comments_parent ON recipe_comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_recipe_comments_created_at ON recipe_comments (created_at);

CREATE INDEX idx_recipe_collections_owner ON recipe_collections (owner_id);
CREATE INDEX idx_recipe_collections_public ON recipe_collections (is_public) WHERE is_public = TRUE;

CREATE INDEX idx_collection_recipes_collection ON collection_recipes (collection_id);
CREATE INDEX idx_collection_recipes_recipe ON collection_recipes (recipe_id);

-- Trigger functions for maintaining counters

-- Update user_profiles counts
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update follower/following counts
    IF TG_TABLE_NAME = 'user_follows' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE user_profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
            UPDATE user_profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE user_profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
            UPDATE user_profiles SET follower_count = follower_count - 1 WHERE id = OLD.following_id;
        END IF;
    END IF;
    
    -- Update recipe counts
    IF TG_TABLE_NAME = 'user_recipes' THEN
        IF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
            UPDATE user_profiles SET recipe_count = recipe_count + 1 WHERE id = NEW.author_id;
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.status != 'published' AND NEW.status = 'published' THEN
                UPDATE user_profiles SET recipe_count = recipe_count + 1 WHERE id = NEW.author_id;
            ELSIF OLD.status = 'published' AND NEW.status != 'published' THEN
                UPDATE user_profiles SET recipe_count = recipe_count - 1 WHERE id = NEW.author_id;
            END IF;
        ELSIF TG_OP = 'DELETE' AND OLD.status = 'published' THEN
            UPDATE user_profiles SET recipe_count = recipe_count - 1 WHERE id = OLD.author_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update recipe interaction counts
CREATE OR REPLACE FUNCTION update_recipe_stats()
RETURNS TRIGGER AS $$
DECLARE
    recipe_author_id UUID;
BEGIN
    -- Update recipe interaction counts
    IF TG_TABLE_NAME = 'recipe_interactions' THEN
        IF TG_OP = 'INSERT' THEN
            IF NEW.interaction_type = 'like' THEN
                UPDATE user_recipes SET like_count = like_count + 1 WHERE id = NEW.recipe_id;
                -- Update author's total likes received
                SELECT author_id INTO recipe_author_id FROM user_recipes WHERE id = NEW.recipe_id;
                UPDATE user_profiles SET total_likes_received = total_likes_received + 1 WHERE id = recipe_author_id;
            ELSIF NEW.interaction_type = 'save' THEN
                UPDATE user_recipes SET save_count = save_count + 1 WHERE id = NEW.recipe_id;
            ELSIF NEW.interaction_type = 'view' THEN
                UPDATE user_recipes SET view_count = view_count + 1 WHERE id = NEW.recipe_id;
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            IF OLD.interaction_type = 'like' THEN
                UPDATE user_recipes SET like_count = like_count - 1 WHERE id = OLD.recipe_id;
                -- Update author's total likes received
                SELECT author_id INTO recipe_author_id FROM user_recipes WHERE id = OLD.recipe_id;
                UPDATE user_profiles SET total_likes_received = total_likes_received - 1 WHERE id = recipe_author_id;
            ELSIF OLD.interaction_type = 'save' THEN
                UPDATE user_recipes SET save_count = save_count - 1 WHERE id = OLD.recipe_id;
            END IF;
        END IF;
    END IF;
    
    -- Update comment counts
    IF TG_TABLE_NAME = 'recipe_comments' THEN
        IF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
            UPDATE user_recipes SET comment_count = comment_count + 1 WHERE id = NEW.recipe_id;
            -- Update reply count for parent comment
            IF NEW.parent_comment_id IS NOT NULL THEN
                UPDATE recipe_comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.status != 'published' AND NEW.status = 'published' THEN
                UPDATE user_recipes SET comment_count = comment_count + 1 WHERE id = NEW.recipe_id;
            ELSIF OLD.status = 'published' AND NEW.status != 'published' THEN
                UPDATE user_recipes SET comment_count = comment_count - 1 WHERE id = NEW.recipe_id;
            END IF;
        ELSIF TG_OP = 'DELETE' AND OLD.status = 'published' THEN
            UPDATE user_recipes SET comment_count = comment_count - 1 WHERE id = OLD.recipe_id;
            -- Update reply count for parent comment
            IF OLD.parent_comment_id IS NOT NULL THEN
                UPDATE recipe_comments SET reply_count = reply_count - 1 WHERE id = OLD.parent_comment_id;
            END IF;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update collection recipe counts
CREATE OR REPLACE FUNCTION update_collection_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE recipe_collections SET recipe_count = recipe_count + 1 WHERE id = NEW.collection_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE recipe_collections SET recipe_count = recipe_count - 1 WHERE id = OLD.collection_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Updated timestamp trigger (reuse existing function)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_user_stats_follows
    AFTER INSERT OR DELETE ON user_follows
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

CREATE TRIGGER update_user_stats_recipes
    AFTER INSERT OR UPDATE OR DELETE ON user_recipes
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

CREATE TRIGGER update_recipe_stats_interactions
    AFTER INSERT OR DELETE ON recipe_interactions
    FOR EACH ROW EXECUTE FUNCTION update_recipe_stats();

CREATE TRIGGER update_recipe_stats_comments
    AFTER INSERT OR UPDATE OR DELETE ON recipe_comments
    FOR EACH ROW EXECUTE FUNCTION update_recipe_stats();

CREATE TRIGGER update_collection_stats
    AFTER INSERT OR DELETE ON collection_recipes
    FOR EACH ROW EXECUTE FUNCTION update_collection_stats();

-- Updated timestamp triggers
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_recipes_updated_at
    BEFORE UPDATE ON user_recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_comments_updated_at
    BEFORE UPDATE ON recipe_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_collections_updated_at
    BEFORE UPDATE ON recipe_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_recipes ENABLE ROW LEVEL SECURITY;

-- User profiles: Public profiles visible to all, private profiles only to owner
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- User recipes: Published recipes visible to all, drafts only to author
CREATE POLICY "Published recipes are viewable by everyone" ON user_recipes
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can view their own recipes" ON user_recipes
    FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Users can insert their own recipes" ON user_recipes
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own recipes" ON user_recipes
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own recipes" ON user_recipes
    FOR DELETE USING (auth.uid() = author_id);

-- Follows: Users can follow/unfollow, view public follows
CREATE POLICY "Users can follow others" ON user_follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" ON user_follows
    FOR DELETE USING (auth.uid() = follower_id);

CREATE POLICY "Follow relationships are viewable by everyone" ON user_follows
    FOR SELECT USING (true);

-- Recipe interactions: Users can interact with published recipes
CREATE POLICY "Users can interact with published recipes" ON recipe_interactions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (SELECT 1 FROM user_recipes WHERE id = recipe_id AND status = 'published')
    );

CREATE POLICY "Users can view recipe interactions" ON recipe_interactions
    FOR SELECT USING (true);

CREATE POLICY "Users can remove their own interactions" ON recipe_interactions
    FOR DELETE USING (auth.uid() = user_id);

-- Comments: Users can comment on published recipes, view published comments
CREATE POLICY "Users can comment on published recipes" ON recipe_comments
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (SELECT 1 FROM user_recipes WHERE id = recipe_id AND status = 'published')
    );

CREATE POLICY "Published comments are viewable by everyone" ON recipe_comments
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can update their own comments" ON recipe_comments
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments" ON recipe_comments
    FOR DELETE USING (auth.uid() = author_id);

-- Collections: Public collections viewable by all, private collections only to owner
CREATE POLICY "Public collections are viewable by everyone" ON recipe_collections
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own collections" ON recipe_collections
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can manage their own collections" ON recipe_collections
    FOR ALL USING (auth.uid() = owner_id);

-- Collection recipes: Based on collection visibility
CREATE POLICY "Collection recipes viewable based on collection visibility" ON collection_recipes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM recipe_collections 
            WHERE id = collection_id 
            AND (is_public = true OR owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage their own collection recipes" ON collection_recipes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM recipe_collections 
            WHERE id = collection_id 
            AND owner_id = auth.uid()
        )
    );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments
COMMENT ON TABLE user_profiles IS 'Extended user profiles with social features for ChefCart cooking platform';
COMMENT ON TABLE user_recipes IS 'User-generated recipes with social metrics and engagement tracking';
COMMENT ON TABLE user_follows IS 'Following relationships between users';
COMMENT ON TABLE recipe_interactions IS 'User interactions with recipes (likes, saves, views)';
COMMENT ON TABLE recipe_comments IS 'Comments and reviews on recipes with nested reply support';
COMMENT ON TABLE recipe_collections IS 'User-created collections/cookbooks of recipes';
COMMENT ON TABLE collection_recipes IS 'Join table linking recipes to collections';

COMMENT ON COLUMN user_profiles.username IS 'Unique handle for user profile URLs (@username)';
COMMENT ON COLUMN user_recipes.slug IS 'URL-friendly recipe identifier unique per author';
COMMENT ON COLUMN user_recipes.story IS 'Personal story or background about the recipe';
COMMENT ON COLUMN user_recipes.ingredients_json IS 'Recipe ingredients in same format as existing meals table';
COMMENT ON COLUMN user_recipes.instructions_json IS 'Step-by-step instructions in same format as existing meals table';