# Storage Buckets Setup Guide

Since Supabase doesn't allow creating storage buckets via SQL (for security reasons), you need to create them manually in the dashboard first, then run the RLS policies.

## Step 1: Create Buckets in Supabase Dashboard

1. Go to your Supabase project: https://supabase.com/dashboard/project/bcbpcuzjkuptyxinjchg
2. Navigate to **Storage** in the sidebar
3. Click **"Create Bucket"** 
4. Create these 4 buckets:

### Bucket 1: recipe-images
- **Name**: `recipe-images`
- **Public**: ✅ Enabled
- **File size limit**: `10485760` (10MB)
- **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp`

### Bucket 2: profile-images  
- **Name**: `profile-images`
- **Public**: ✅ Enabled
- **File size limit**: `5242880` (5MB)
- **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp`

### Bucket 3: collection-covers
- **Name**: `collection-covers`
- **Public**: ✅ Enabled  
- **File size limit**: `5242880` (5MB)
- **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp`

### Bucket 4: comment-images
- **Name**: `comment-images`
- **Public**: ✅ Enabled
- **File size limit**: `3145728` (3MB)  
- **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp`

## Step 2: Run RLS Policies

After creating all 4 buckets manually, run this SQL script in the **SQL Editor**:

```sql
-- /scripts/setup-supabase-storage.sql
```

This will set up the Row Level Security policies so users can only access their own images.

## Step 3: Verify Setup

Check that buckets were created correctly:

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('recipe-images', 'profile-images', 'collection-covers', 'comment-images');
```

You should see all 4 buckets with the correct settings.

## File Organization Structure

Once setup is complete, files will be organized like this:

```
recipe-images/
  └── {user_id}/
      └── {recipe_id}/
          ├── image1.jpg
          ├── image2.jpg
          └── image3.jpg

profile-images/
  └── {user_id}/
      ├── avatar.jpg
      └── cover.jpg

collection-covers/
  └── {user_id}/
      └── {collection_id}/
          └── cover.jpg

comment-images/
  └── {user_id}/
      └── {comment_id}/
          └── image.jpg
```

## Testing Upload

Once buckets are created and policies are active, you can test image uploads using the utilities in `lib/supabase-storage.ts`:

```typescript
import { uploadAvatar, uploadRecipeImages } from '@/lib/supabase-storage'

// Test avatar upload
const result = await uploadAvatar(userId, avatarFile)
console.log('Upload result:', result)
```

The storage system is now ready for your social cooking platform!