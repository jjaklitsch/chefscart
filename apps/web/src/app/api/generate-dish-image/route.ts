import { NextRequest, NextResponse } from 'next/server'
import { dalleRateLimiter } from '../../../../lib/dalle-rate-limiter'

export const dynamic = 'force-dynamic'

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

    // Generate image using rate-limited queue
    console.log(`Generating image with rate limiting for: ${dishName}`)
    const imageUrl = await dalleRateLimiter.generateImage(
      imagePrompt,
      "512x512" // DALL-E 2 supports 256x256, 512x512, or 1024x1024
    )

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