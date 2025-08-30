import { createAuthClient } from './supabase'

// Supabase Storage helper functions for social cooking platform

export interface UploadImageOptions {
  bucket: 'recipe-images' | 'profile-images' | 'collection-covers' | 'comment-images'
  folder: string // e.g., user_id/recipe_id or user_id/collection_id
  file: File
  fileName?: string // optional custom filename
}

export interface UploadImageResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

/**
 * Upload an image to Supabase Storage
 */
export async function uploadImage(options: UploadImageOptions): Promise<UploadImageResult> {
  try {
    const supabase = createAuthClient()
    const { bucket, folder, file, fileName } = options

    // Generate filename if not provided
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const finalFileName = fileName || `${Date.now()}.${fileExtension}`
    const filePath = `${folder}/${finalFileName}`

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      }
    }

    // Validate file size based on bucket
    const maxSizes = {
      'recipe-images': 10 * 1024 * 1024, // 10MB
      'profile-images': 5 * 1024 * 1024,  // 5MB  
      'collection-covers': 5 * 1024 * 1024, // 5MB
      'comment-images': 3 * 1024 * 1024    // 3MB
    }

    if (file.size > maxSizes[bucket]) {
      return {
        success: false,
        error: `File too large. Maximum size: ${maxSizes[bucket] / (1024 * 1024)}MB`
      }
    }

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrl,
      path: filePath
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImage(bucket: string, path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAuthClient()

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    return { success: true }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

/**
 * Upload multiple recipe images
 */
export async function uploadRecipeImages(
  userId: string,
  recipeId: string,
  files: File[]
): Promise<{ success: boolean; urls: string[]; errors: string[] }> {
  const results = await Promise.allSettled(
    files.map((file, index) =>
      uploadImage({
        bucket: 'recipe-images',
        folder: `${userId}/${recipeId}`,
        file,
        fileName: `image-${index + 1}.${file.name.split('.').pop()}`
      })
    )
  )

  const urls: string[] = []
  const errors: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      urls.push(result.value.url!)
    } else {
      const error = result.status === 'fulfilled' 
        ? result.value.error 
        : result.reason?.message || 'Upload failed'
      errors.push(`File ${index + 1}: ${error}`)
    }
  })

  return {
    success: urls.length > 0,
    urls,
    errors
  }
}

/**
 * Upload profile avatar
 */
export async function uploadAvatar(userId: string, file: File): Promise<UploadImageResult> {
  return uploadImage({
    bucket: 'profile-images',
    folder: userId,
    file,
    fileName: 'avatar.jpg'
  })
}

/**
 * Upload profile cover image
 */
export async function uploadCoverImage(userId: string, file: File): Promise<UploadImageResult> {
  return uploadImage({
    bucket: 'profile-images',
    folder: userId,
    file,
    fileName: 'cover.jpg'
  })
}

/**
 * Upload collection cover image
 */
export async function uploadCollectionCover(
  userId: string,
  collectionId: string,
  file: File
): Promise<UploadImageResult> {
  return uploadImage({
    bucket: 'collection-covers',
    folder: `${userId}/${collectionId}`,
    file,
    fileName: 'cover.jpg'
  })
}

/**
 * Get optimized image URL with transformations
 * Supabase doesn't support image transformations by default,
 * but we can add query parameters for future optimization
 */
export function getOptimizedImageUrl(url: string, options?: {
  width?: number
  height?: number
  quality?: number
}): string {
  if (!options) return url

  // For now, return the original URL
  // In future, can integrate with image optimization service
  return url
}

/**
 * Generate storage path helpers
 */
export const storagePaths = {
  recipeImage: (userId: string, recipeId: string, fileName: string) =>
    `${userId}/${recipeId}/${fileName}`,
  
  avatar: (userId: string) =>
    `${userId}/avatar.jpg`,
    
  cover: (userId: string) =>
    `${userId}/cover.jpg`,
    
  collectionCover: (userId: string, collectionId: string) =>
    `${userId}/${collectionId}/cover.jpg`,
    
  commentImage: (userId: string, commentId: string, fileName: string) =>
    `${userId}/${commentId}/${fileName}`
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.'
    }
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB.`
    }
  }

  return { valid: true }
}