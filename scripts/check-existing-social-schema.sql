-- Check existing social-related tables in the database
-- Run this to see what already exists

-- Check if social tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_profiles',
    'user_recipes', 
    'user_follows',
    'recipe_interactions',
    'recipe_comments',
    'recipe_collections',
    'collection_recipes'
)
ORDER BY table_name;

-- Check user_profiles structure if it exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing indexes on user_profiles
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_profiles' 
AND schemaname = 'public';

-- Check RLS policies on user_profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';