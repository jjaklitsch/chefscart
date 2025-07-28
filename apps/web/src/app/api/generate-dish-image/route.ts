import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10000, // Shorter timeout for speed
    })
  }
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  return openai
}

export async function POST(request: NextRequest) {
  try {
    const { dishName, mealType, description, thumbnail = false } = await request.json()

    if (!dishName) {
      return NextResponse.json({
        error: 'Dish name is required'
      }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'OpenAI API key not configured'
      }, { status: 500 })
    }

    console.log(`Generating image for: ${dishName}`)

    // Create optimized prompt based on whether it's a thumbnail
    const imagePrompt = thumbnail 
      ? `Top-down shot of ${dishName}, served on a clean white rimmed plate placed on a spotless white tabletop, high-key lighting, no napkins or cutlery visible, professional food photography, square composition`
      : `Professional food photography of ${dishName}. 
${description ? `The dish is: ${description}. ` : ''}
Shot from a 45-degree angle on a clean white background. 
Bright, natural lighting. High-quality, appetizing presentation. 
Restaurant-quality plating with garnish. Photorealistic style.`

    // Race against timeout for speed
    const response = await Promise.race([
      getOpenAIClient().images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: thumbnail ? "512x512" : "1024x1024", // Smaller size for thumbnails
        quality: "standard", // Standard quality for speed
        style: "natural"
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('DALL-E generation timeout')), 8000) // 8s timeout
      )
    ])

    const imageUrl = response.data[0]?.url
    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI')
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      dishName,
      prompt: imagePrompt
    })

  } catch (error) {
    console.error('Error generating dish image:', error)
    return NextResponse.json({
      error: 'Failed to generate dish image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}