-- Database Security Setup for ChefsCart
-- Run these commands in the Supabase SQL Editor

-- Enable RLS on auth.users (already enabled by default in Supabase)
-- This ensures users can only access their own data

-- Create user_profiles table for additional user data
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    zip_code VARCHAR(10),
    preferences JSONB DEFAULT '{}',
    completed_onboarding BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and modify their own profile
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create meal_plans table for storing user meal plans
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    recipes JSONB NOT NULL DEFAULT '[]',
    consolidated_cart JSONB DEFAULT '[]',
    user_preferences JSONB DEFAULT '{}',
    cart_url TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    zip_code VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on meal_plans
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own meal plans
CREATE POLICY "Users can view their own meal plans" ON public.meal_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meal plans" ON public.meal_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans" ON public.meal_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans" ON public.meal_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON public.meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_created_at ON public.meal_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON public.meal_plans(status);

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_meal_plans_updated_at ON public.meal_plans;
CREATE TRIGGER update_meal_plans_updated_at 
    BEFORE UPDATE ON public.meal_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.user_profiles IS 'Extended user profile data with preferences and settings';
COMMENT ON TABLE public.meal_plans IS 'User meal plans with recipes and shopping cart data';
COMMENT ON POLICY "Users can view their own profile" ON public.user_profiles IS 'RLS policy ensuring users can only access their own profile data';
COMMENT ON POLICY "Users can view their own meal plans" ON public.meal_plans IS 'RLS policy ensuring users can only access their own meal plans';