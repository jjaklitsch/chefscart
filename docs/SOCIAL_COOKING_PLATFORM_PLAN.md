# Social Cooking Platform Implementation Plan

## Overview
Transform ChefCart from meal planning service into viral social cooking platform with user-generated content, Instagram-style profiles, and AI-powered recipe assistance.

## Database Schema

### Enhanced User Profiles
```sql
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
    
    -- Social stats
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    recipe_count INTEGER DEFAULT 0,
    total_likes_received INTEGER DEFAULT 0,
    
    -- Profile settings
    is_public BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Existing ChefCart preferences
    zip_code VARCHAR(10),
    preferences JSONB,
    completed_onboarding BOOLEAN DEFAULT FALSE
);
```

### User-Generated Recipes
```sql
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
    spice_level INTEGER CHECK (spice_level BETWEEN 1 AND 5),
    cost_estimate VARCHAR(10) CHECK (cost_estimate IN ('$', '$$', '$$$')),
    
    -- Recipe content
    ingredients_json JSONB NOT NULL,
    instructions_json JSONB NOT NULL,
    tips_json JSONB, -- cooking tips and variations
    
    -- Social metrics
    like_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Moderation
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'flagged')),
    featured_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(author_id, slug)
);
```

### Social Features Tables
```sql
-- Following system
CREATE TABLE user_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(follower_id, following_id)
);

-- Recipe interactions (likes, saves)
CREATE TABLE recipe_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES user_recipes(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) CHECK (interaction_type IN ('like', 'save', 'view')),
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
    parent_comment_id UUID REFERENCES recipe_comments(id),
    
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- optional star rating
    images TEXT[] DEFAULT '{}', -- photos of their cooking attempt
    
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'flagged', 'deleted'))
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
    recipe_count INTEGER DEFAULT 0
);

-- Join table for recipes in collections
CREATE TABLE collection_recipes (
    collection_id UUID REFERENCES recipe_collections(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES user_recipes(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    PRIMARY KEY (collection_id, recipe_id)
);
```

## URL Structure
- `/profile/[username]` - User profile  
- `/profile/[username]/recipes/[slug]` - Individual recipes
- `/recipe/[recipe-id]` - Direct recipe links for sharing
- `/discover` - Discovery page with trending, new, categories
- `/following` - Feed from followed users

## AI Assistance Features

### Photo-to-Recipe Generation
- **Scan recipe cards/screenshots** → Extract title, ingredients, instructions
- **Multiple dish photos** → Suggest ingredients, cooking methods, timing
- **Ingredient photo recognition** → Auto-populate ingredient list with quantities

### Smart Recipe Assistant
- **Instruction optimization**: Add timing and details to vague instructions
- **Nutritional estimation** from ingredients and serving size
- **Scaling assistance**: Convert family recipes to standard servings
- **Allergen detection**: Auto-flag common allergens from ingredient list

### Content Enhancement
- **Recipe story prompts**: Encourage personal stories behind recipes
- **Title suggestions**: Improve recipe titles for discoverability
- **Tag recommendations**: Suggest cuisine, dietary tags, seasonal categories
- **Similar recipe detection**: Prevent duplicates, highlight uniqueness

## Implementation Phases

### Phase 1: Foundation (Month 1-2)
**Priority: Database & Core Social**
- [ ] Extend Supabase schema with social tables
- [ ] Create user profile migration system  
- [ ] Implement username/handle system
- [ ] Set up image/video storage (Supabase Storage)
- [ ] User profiles with bio, avatar, recipe grid
- [ ] Follow/unfollow functionality  
- [ ] Basic recipe submission form
- [ ] Recipe viewing pages with routing

### Phase 2: Core Social Features (Month 2-3)
**Priority: Interactions & Discovery**
- [ ] Like, save, comment system
- [ ] Recipe collections/cookbooks
- [ ] Basic search functionality
- [ ] Recipe sharing with Open Graph metadata
- [ ] Following feed showing recipes from followed users
- [ ] Trending/popular recipe algorithm
- [ ] Basic recommendation engine based on preferences

### Phase 3: AI Enhancement (Month 3-4)
**Priority: Smart Features**
- [ ] Photo-to-ingredient recognition using OpenAI Vision
- [ ] Recipe content optimization and suggestions
- [ ] Auto-tagging and classification
- [ ] Nutritional estimation
- [ ] Personalized recommendations using existing preference system
- [ ] Seasonal/trending recipe collections
- [ ] Advanced search with filters

### Phase 4: Viral Features (Month 4-5)
**Priority: Sharing & Recognition**
- [ ] Automated social media card generation
- [ ] Story-optimized formats
- [ ] Recipe attribution system
- [ ] Print-friendly versions with QR codes
- [ ] Achievement system and badges
- [ ] Weekly challenges and contests  
- [ ] Featured chef program
- [ ] Recipe analytics for creators

## TypeScript Interfaces

### Extended User Types
```typescript
export interface SocialUserProfile extends UserProfile {
  username: string
  display_name: string
  bio?: string
  avatar_url?: string
  cover_image_url?: string
  location?: string
  website_url?: string
  
  follower_count: number
  following_count: number
  recipe_count: number
  total_likes_received: number
  
  is_public: boolean
  is_verified: boolean
}

export interface UserRecipe {
  id: string
  created_at: Date
  updated_at: Date
  
  author_id: string
  author?: SocialUserProfile
  
  slug: string
  title: string
  description: string
  story?: string
  
  image_urls: string[]
  video_url?: string
  
  cuisines: string[]
  courses: string[]
  diets_supported: string[]
  allergens_present: string[]
  ingredient_tags: string[]
  
  prep_time?: number
  cook_time?: number
  total_time?: number
  servings_default: number
  difficulty: 'easy' | 'medium' | 'challenging'
  spice_level: number
  cost_estimate: '$' | '$$' | '$$$'
  
  ingredients_json: RecipeIngredientsJSON
  instructions_json: RecipeInstructionsJSON
  tips_json?: RecipeTipsJSON
  
  like_count: number
  save_count: number
  comment_count: number
  view_count: number
  share_count: number
  
  status: 'draft' | 'published' | 'archived' | 'flagged'
  featured_at?: Date
}

export interface RecipeInteraction {
  id: string
  user_id: string
  recipe_id: string
  interaction_type: 'like' | 'save' | 'view'
  created_at: Date
}

export interface RecipeComment {
  id: string
  recipe_id: string
  author_id: string
  author?: SocialUserProfile
  parent_comment_id?: string
  content: string
  rating?: number
  images: string[]
  like_count: number
  reply_count: number
  status: 'published' | 'flagged' | 'deleted'
  created_at: Date
  updated_at: Date
}
```

## Key Implementation Notes

### Migration Strategy
1. Extend existing `User` interface to include social fields
2. Create migration script to populate usernames from existing emails
3. Preserve existing preference system and onboarding flow
4. Gradually migrate curated meals to be "ChefCart Official" recipes

### Performance Considerations
- Image optimization with Next.js Image component
- Recipe data caching with SWR
- Infinite scroll for feeds
- Progressive loading for recipe grids
- Database indexing on social interaction tables

### Content Moderation
- Content reporting system
- Automated spam detection using OpenAI moderation
- Community guidelines enforcement
- Recipe quality standards with AI assistance

### Revenue Model Extensions
- Premium creator features (analytics, promoted recipes)
- Sponsored recipe placements
- Enhanced Instacart cart generation for user recipes
- Cooking equipment affiliate partnerships

## Success Metrics
- **User Engagement**: Recipe uploads per week, comments per recipe
- **Social Growth**: Follower growth rate, recipe sharing frequency  
- **Content Quality**: Recipe completion rate, user ratings
- **Viral Potential**: Social media shares, external traffic from recipes
- **Revenue Impact**: Conversion from social discovery to meal planning

---

**Next Steps**: Begin Phase 1 implementation starting with database schema setup and basic user profile system.