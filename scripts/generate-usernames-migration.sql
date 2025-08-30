-- Generate usernames for existing user_profiles
-- This populates the username field from email addresses or creates random ones

DO $$
DECLARE
    profile_record RECORD;
    base_username VARCHAR(50);
    final_username VARCHAR(50);
    counter INTEGER;
    email_local VARCHAR(50);
BEGIN
    -- Loop through all user profiles without usernames
    FOR profile_record IN 
        SELECT id, email, display_name 
        FROM user_profiles 
        WHERE username IS NULL OR username = ''
    LOOP
        -- Extract local part from email if available
        IF profile_record.email IS NOT NULL THEN
            email_local := split_part(profile_record.email, '@', 1);
            -- Clean up the email local part to be username-friendly
            base_username := regexp_replace(lower(email_local), '[^a-z0-9]', '', 'g');
            -- Limit to 20 chars to leave room for numbers
            base_username := left(base_username, 20);
        ELSIF profile_record.display_name IS NOT NULL THEN
            -- Use display name if no email
            base_username := regexp_replace(lower(profile_record.display_name), '[^a-z0-9]', '', 'g');
            base_username := left(base_username, 20);
        ELSE
            -- Generate random username as fallback
            base_username := 'chef' || floor(random() * 1000000)::text;
        END IF;

        -- Ensure minimum length
        IF length(base_username) < 3 THEN
            base_username := 'chef' || floor(random() * 1000000)::text;
        END IF;

        -- Check if base username is available
        counter := 0;
        final_username := base_username;
        
        WHILE EXISTS (SELECT 1 FROM user_profiles WHERE username = final_username) LOOP
            counter := counter + 1;
            final_username := base_username || counter::text;
            
            -- Ensure we don't exceed 50 chars
            IF length(final_username) > 50 THEN
                final_username := left(base_username, 45) || counter::text;
            END IF;
        END LOOP;

        -- Update the user profile with the generated username
        UPDATE user_profiles 
        SET username = final_username,
            display_name = COALESCE(profile_record.display_name, 'Chef ' || initcap(final_username))
        WHERE id = profile_record.id;

        RAISE NOTICE 'Generated username % for user %', final_username, profile_record.id;
    END LOOP;
END $$;

-- Now add the constraints after usernames are populated
ALTER TABLE user_profiles 
ADD CONSTRAINT username_format 
CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$');

ALTER TABLE user_profiles 
ADD CONSTRAINT username_not_reserved 
CHECK (username NOT IN ('admin', 'api', 'www', 'app', 'support', 'help', 'about', 'chefscart', 'official', 'chef', 'recipe', 'recipes', 'profile', 'profiles', 'user', 'users'));

-- Make username NOT NULL after population
ALTER TABLE user_profiles 
ALTER COLUMN username SET NOT NULL;

-- Make display_name NOT NULL after population  
ALTER TABLE user_profiles 
ALTER COLUMN display_name SET NOT NULL;

-- Show final username counts
SELECT 
    COUNT(*) as total_profiles,
    COUNT(username) as profiles_with_usernames
FROM user_profiles;