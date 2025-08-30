-- Setup Supabase Storage buckets for social cooking platform
-- NOTE: Storage buckets must be created via Supabase Dashboard, not SQL
-- 
-- Go to: Storage > Create Bucket in Supabase Dashboard
-- Create these buckets manually:
-- 
-- 1. recipe-images (Public, 10MB limit)
-- 2. profile-images (Public, 5MB limit)  
-- 3. collection-covers (Public, 5MB limit)
-- 4. comment-images (Public, 3MB limit)
-- 
-- Then run the RLS policies below:

-- Storage policies for recipe images
CREATE POLICY "Users can upload recipe images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recipe-images' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  );

CREATE POLICY "Recipe images are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'recipe-images');

CREATE POLICY "Users can update their own recipe images" ON storage.objects
  FOR UPDATE WITH CHECK (
    bucket_id = 'recipe-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own recipe images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'recipe-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for profile images (avatars, covers)
CREATE POLICY "Users can upload profile images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-images' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  );

CREATE POLICY "Profile images are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-images');

CREATE POLICY "Users can update their own profile images" ON storage.objects
  FOR UPDATE WITH CHECK (
    bucket_id = 'profile-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for collection covers
CREATE POLICY "Users can upload collection covers" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'collection-covers' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  );

CREATE POLICY "Collection covers are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'collection-covers');

CREATE POLICY "Users can update their own collection covers" ON storage.objects
  FOR UPDATE WITH CHECK (
    bucket_id = 'collection-covers' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own collection covers" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'collection-covers' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for comment images (cooking attempt photos)
CREATE POLICY "Users can upload comment images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'comment-images' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  );

CREATE POLICY "Comment images are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'comment-images');

CREATE POLICY "Users can update their own comment images" ON storage.objects
  FOR UPDATE WITH CHECK (
    bucket_id = 'comment-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own comment images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'comment-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Verify buckets exist (optional - for checking after manual creation)
-- SELECT id, name, public, file_size_limit, allowed_mime_types 
-- FROM storage.buckets 
-- WHERE id IN ('recipe-images', 'profile-images', 'collection-covers', 'comment-images');

-- File organization structure:
-- recipe-images/{user_id}/{recipe_id}/image1.jpg
-- recipe-images/{user_id}/{recipe_id}/image2.jpg  
-- profile-images/{user_id}/avatar.jpg
-- profile-images/{user_id}/cover.jpg
-- collection-covers/{user_id}/{collection_id}/cover.jpg
-- comment-images/{user_id}/{comment_id}/image.jpg