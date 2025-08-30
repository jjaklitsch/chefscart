-- Verification script to check social platform setup
-- Run this in Supabase SQL Editor to verify everything is configured correctly

-- 1. Check all social tables exist
SELECT 
    'Tables Check' as check_type,
    COUNT(*) as tables_found,
    ARRAY_AGG(table_name ORDER BY table_name) as table_list
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
);

-- 2. Check user_profiles has all required columns
SELECT 
    'User Profiles Columns' as check_type,
    COUNT(*) as columns_found,
    COUNT(*) FILTER (WHERE column_name = 'username') as has_username,
    COUNT(*) FILTER (WHERE column_name = 'display_name') as has_display_name,
    COUNT(*) FILTER (WHERE column_name = 'bio') as has_bio,
    COUNT(*) FILTER (WHERE column_name = 'avatar_url') as has_avatar,
    COUNT(*) FILTER (WHERE column_name = 'follower_count') as has_follower_count,
    COUNT(*) FILTER (WHERE column_name = 'recipe_count') as has_recipe_count
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public';

-- 3. Check storage buckets are created
SELECT 
    'Storage Buckets' as check_type,
    COUNT(*) as buckets_found,
    ARRAY_AGG(id ORDER BY id) as bucket_list
FROM storage.buckets 
WHERE id IN ('recipe-images', 'profile-images', 'collection-covers', 'comment-images');

-- 4. Check if any users have usernames populated
SELECT 
    'Username Population' as check_type,
    COUNT(*) as total_users,
    COUNT(username) as users_with_usernames,
    COUNT(display_name) as users_with_display_names
FROM user_profiles;

-- 5. Check indexes are created for performance
SELECT 
    'Indexes' as check_type,
    COUNT(*) as indexes_found,
    ARRAY_AGG(indexname ORDER BY indexname) as index_list
FROM pg_indexes 
WHERE tablename IN ('user_profiles', 'user_recipes', 'user_follows', 'recipe_interactions')
AND schemaname = 'public';

-- 6. Check RLS is enabled on social tables
SELECT 
    'RLS Status' as check_type,
    tablename,
    rowsecurity as rls_enabled,
    COUNT(policyname) as policies_count
FROM pg_tables 
LEFT JOIN pg_policies USING (schemaname, tablename)
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'user_recipes', 'user_follows', 'recipe_interactions', 'recipe_comments', 'recipe_collections', 'collection_recipes')
GROUP BY tablename, rowsecurity
ORDER BY tablename;

-- 7. Check trigger functions exist
SELECT 
    'Trigger Functions' as check_type,
    COUNT(*) as triggers_found,
    ARRAY_AGG(trigger_name ORDER BY trigger_name) as trigger_list
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('user_profiles', 'user_recipes', 'user_follows', 'recipe_interactions', 'recipe_comments', 'recipe_collections', 'collection_recipes');

-- Summary check
DO $$
DECLARE
    table_count INTEGER;
    bucket_count INTEGER;
    user_count INTEGER;
    username_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('user_profiles', 'user_recipes', 'user_follows', 'recipe_interactions', 'recipe_comments', 'recipe_collections', 'collection_recipes');
    
    -- Count buckets
    SELECT COUNT(*) INTO bucket_count
    FROM storage.buckets 
    WHERE id IN ('recipe-images', 'profile-images', 'collection-covers', 'comment-images');
    
    -- Count users with usernames
    SELECT COUNT(*), COUNT(username) INTO user_count, username_count
    FROM user_profiles;
    
    RAISE NOTICE '=================================';
    RAISE NOTICE 'SOCIAL PLATFORM SETUP VERIFICATION';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Tables created: % of 7', table_count;
    RAISE NOTICE 'Storage buckets: % of 4', bucket_count;
    RAISE NOTICE 'Users with usernames: % of %', username_count, user_count;
    
    IF table_count = 7 AND bucket_count = 4 THEN
        RAISE NOTICE '✅ SETUP COMPLETE! All components are ready.';
    ELSE
        RAISE NOTICE '⚠️  SETUP INCOMPLETE:';
        IF table_count < 7 THEN
            RAISE NOTICE '  - Missing % tables', 7 - table_count;
        END IF;
        IF bucket_count < 4 THEN
            RAISE NOTICE '  - Missing % storage buckets', 4 - bucket_count;
        END IF;
    END IF;
    RAISE NOTICE '=================================';
END $$;