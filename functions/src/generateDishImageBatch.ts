import { Request, Response } from 'firebase-functions'
import fetch from 'node-fetch'
import { getStorage } from 'firebase-admin/storage'
import { getFirestore } from 'firebase-admin/firestore'

const storage = getStorage()
const db = getFirestore()

interface BatchImageRequest {
  recipes: Array<{
    id: string
    title: string
    description?: string
    cuisine?: string
  }>
}

export async function generateDishImageBatch(req: Request, res: Response) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { recipes }: BatchImageRequest = req.body

    if (!recipes || !Array.isArray(recipes)) {
      return res.status(400).json({ error: 'Invalid recipes array' })
    }

    console.log(`Generating batch images for ${recipes.length} recipes`)

    const imageMap: Record<string, string> = {}
    const startTime = Date.now()

    // Process recipes in smaller batches to avoid timeouts
    const batchSize = 3 // Smaller batches for reliability
    for (let i = 0; i < recipes.length; i += batchSize) {
      const batch = recipes.slice(i, i + batchSize)
      
      // Generate images for this batch in parallel
      const batchPromises = batch.map(recipe => 
        generateSingleImage(recipe).then(url => {
          imageMap[recipe.id] = url
          return { id: recipe.id, url }
        }).catch(error => {
          console.warn(`Failed to generate image for ${recipe.title}:`, error.message)
          imageMap[recipe.id] = '/images/placeholder-meal.webp'
          return { id: recipe.id, url: '/images/placeholder-meal.webp' }
        })
      )
      
      await Promise.all(batchPromises)
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < recipes.length) {
        await new Promise(resolve => setTimeout(resolve, 500)) // Shorter delay
      }
    }

    const totalTime = Date.now() - startTime
    console.log(`Batch image generation completed in ${totalTime}ms (${recipes.length} images)`)

    return res.status(200).json({
      success: true,
      imageMap,
      generated: Object.keys(imageMap).length,
      generationTime: totalTime
    })

  } catch (error) {
    console.error('Error in batch image generation:', error)
    return res.status(500).json({ 
      error: 'Failed to generate batch images',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function generateSingleImage(recipe: { id: string; title: string; description?: string; cuisine?: string }): Promise<string> {
  try {
    // Check cache first
    const cachedUrl = await getCachedThumbnail(recipe.id)
    if (cachedUrl) {
      console.log(`Using cached image for ${recipe.title}`)
      return cachedUrl
    }

    // Create optimized prompt for thumbnail generation
    const prompt = `Top-down shot of ${recipe.title}, served on a clean white rimmed plate placed on a spotless white tabletop, high-key lighting, no napkins or cutlery visible, professional food photography, square composition`

    console.log(`Generating image for ${recipe.title}`)
    
    // Call DALL-E API with shorter timeout
    const response = await Promise.race([
      fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          size: '512x512',
          quality: 'standard', // Keep standard quality for speed
          n: 1,
          style: 'natural'
        })
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('DALL-E timeout')), 8000) // 8 second timeout
      )
    ])

    if (!response.ok) {
      throw new Error(`DALL-E API error: ${response.status}`)
    }

    const data = await response.json() as any
    const imageUrl = data.data?.[0]?.url

    if (!imageUrl) {
      throw new Error('No image URL in DALL-E response')
    }

    // Download and save to Firebase Storage (with timeout)
    const savedUrl = await Promise.race([
      saveToStorage(imageUrl, recipe.id),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Storage save timeout')), 5000)
      )
    ])
    
    // Cache the URL
    await cacheThumbnail(recipe.id, savedUrl)
    
    return savedUrl
  } catch (error) {
    console.warn(`Failed to generate image for ${recipe.title}:`, error)
    throw error
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