import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { dishName, description, cuisine } = await request.json()

    if (!dishName) {
      return NextResponse.json(
        { error: 'Dish name is required' },
        { status: 400 }
      )
    }

    // Create a detailed prompt for DALL-E
    const imagePrompt = createImagePrompt(dishName, description, cuisine)
    
    console.log('Generating image for:', dishName)
    console.log('Prompt:', imagePrompt)

    // Generate image with DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    })

    const imageUrl = response.data?.[0]?.url

    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E')
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      dishName,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('DALL-E image generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate dish image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createImagePrompt(dishName: string, description?: string, cuisine?: string): string {
  // Create a detailed, appetizing prompt for food photography
  const basePrompt = `Professional food photography of ${dishName}`
  
  // Add description context if available
  const contextualDetails = description ? `, ${description}` : ''
  
  // Add cuisine-specific styling
  const cuisineStyle = cuisine ? `, ${cuisine} cuisine style` : ''
  
  // Professional photography specifications with white plate and clean background
  const photographySpecs = `, single serving beautifully plated on a simple white ceramic plate, pure white seamless background, no props or table settings, overhead shot, bright studio lighting, minimal shadows, garnished simply, restaurant-quality presentation, photorealistic, high resolution food photography, commercial food styling, isolated on white, no background clutter`

  return `${basePrompt}${contextualDetails}${cuisineStyle}${photographySpecs}`
}