import fetch from 'node-fetch'
import { getStorage } from 'firebase-admin/storage'
import { getFirestore } from 'firebase-admin/firestore'

const storage = getStorage()
const db = getFirestore()

interface ThumbnailOptions {
  recipeId: string
  dishName: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'dessert' | 'coffee'
}

export async function generateThumbnail({ recipeId, dishName, mealType }: ThumbnailOptions): Promise<string> {
  try {
    // Check cache first
    const cachedUrl = await getCachedThumbnail(recipeId)
    if (cachedUrl) {
      console.log(`Using cached thumbnail for recipe ${recipeId}`)
      return cachedUrl
    }

    // Determine view angle based on meal type
    const viewAngle = ['breakfast', 'lunch', 'dinner'].includes(mealType) ? 'Top-down' : '45-degree'
    
    // Create optimized prompt
    const prompt = `${viewAngle} photorealistic image of ${dishName}, served on a plain white plate on a white or light wood table, soft natural light, no props, minimal background, high detail.`

    console.log(`Generating thumbnail for ${dishName} (${mealType})`)
    
    // Call DALL-E API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        size: '512x512',
        quality: 'standard',
        n: 1,
        style: 'natural'
      })
    })

    if (!response.ok) {
      throw new Error(`DALL-E API error: ${response.status}`)
    }

    const data = await response.json() as any
    const imageUrl = data.data?.[0]?.url

    if (!imageUrl) {
      throw new Error('No image URL in DALL-E response')
    }

    // Download and save to Firebase Storage
    const savedUrl = await saveToStorage(imageUrl, recipeId)
    
    // Cache the URL
    await cacheThumbnail(recipeId, savedUrl)
    
    return savedUrl
  } catch (error) {
    console.error(`Failed to generate thumbnail for ${dishName}:`, error)
    return '/images/placeholder-meal.webp' // Fallback
  }
}

async function getCachedThumbnail(recipeId: string): Promise<string | null> {
  try {
    const doc = await db.collection('thumbnailCache').doc(recipeId).get()
    if (doc.exists) {
      const data = doc.data()
      if (data?.url && data?.expiresAt > Date.now()) {
        return data.url
      }
    }
    return null
  } catch {
    return null
  }
}

async function cacheThumbnail(recipeId: string, url: string): Promise<void> {
  try {
    await db.collection('thumbnailCache').doc(recipeId).set({
      url,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
    })
  } catch (error) {
    console.error('Failed to cache thumbnail:', error)
  }
}

async function saveToStorage(imageUrl: string, recipeId: string): Promise<string> {
  try {
    // Download image
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error('Failed to download image')
    
    const buffer = await response.buffer()
    
    // Save to Firebase Storage
    const bucket = storage.bucket()
    const fileName = `thumbnails/${recipeId}.webp`
    const file = bucket.file(fileName)
    
    await file.save(buffer, {
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000' // 1 year
      }
    })
    
    // Make public and get URL
    await file.makePublic()
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`
  } catch (error) {
    console.error('Failed to save to storage:', error)
    throw error
  }
}

// Batch generation function for multiple recipes
export async function generateThumbnailBatch(recipes: Array<{ id: string; title: string; mealType: string }>): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  
  // Process in batches of 5 to respect rate limits
  const batchSize = 5
  for (let i = 0; i < recipes.length; i += batchSize) {
    const batch = recipes.slice(i, i + batchSize)
    const promises = batch.map(recipe => 
      generateThumbnail({
        recipeId: recipe.id,
        dishName: recipe.title,
        mealType: recipe.mealType as any
      }).then(url => results.set(recipe.id, url))
    )
    
    await Promise.all(promises)
    
    // Add delay between batches to avoid rate limiting
    if (i + batchSize < recipes.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return results
}