-- User Favorite Meals Table
-- This table tracks individual meals that users have favorited
CREATE TABLE IF NOT EXISTS public.user_favorite_meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    meal_id INTEGER NOT NULL, -- References meals.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, meal_id) -- Prevent duplicate favorites
);

-- Enable RLS on user_favorite_meals
ALTER TABLE public.user_favorite_meals ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own favorites
CREATE POLICY "Users can view their own favorite meals" ON public.user_favorite_meals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorite meals" ON public.user_favorite_meals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite meals" ON public.user_favorite_meals
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_favorite_meals_user_id ON public.user_favorite_meals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_meals_meal_id ON public.user_favorite_meals(meal_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_meals_created_at ON public.user_favorite_meals(created_at DESC);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.user_favorite_meals TO authenticated;

-- Add reordering fields to existing meal_plans table
-- This will help track reordering history
ALTER TABLE public.meal_plans 
ADD COLUMN IF NOT EXISTS original_plan_id UUID REFERENCES public.meal_plans(id),
ADD COLUMN IF NOT EXISTS reorder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reordered_at TIMESTAMP WITH TIME ZONE;

-- Index for reordering queries
CREATE INDEX IF NOT EXISTS idx_meal_plans_original_plan_id ON public.meal_plans(original_plan_id);

-- Comments for documentation
COMMENT ON TABLE public.user_favorite_meals IS 'User favorite meals for quick reordering and personalization';
COMMENT ON COLUMN public.meal_plans.original_plan_id IS 'References the original meal plan if this is a reorder';
COMMENT ON COLUMN public.meal_plans.reorder_count IS 'Number of times this plan or its original has been reordered';
COMMENT ON COLUMN public.meal_plans.last_reordered_at IS 'Last time this plan was reordered';