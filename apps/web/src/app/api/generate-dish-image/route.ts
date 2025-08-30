import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dishName, cuisine, description } = body

    if (!dishName) {
      return NextResponse.json({
        success: false,
        error: 'Dish name is required'
      }, { status: 400 })
    }

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      // Return a fallback placeholder image
      return NextResponse.json({
        success: true,
        imageUrl: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&crop=center`,
        message: 'Using placeholder image (OpenAI not configured)'
      })
    }

    // Create a descriptive prompt for DALL-E
    const prompt = `A beautifully plated ${dishName}${cuisine ? ` in ${cuisine} style` : ''}${description ? `, ${description}` : ''}, professional food photography, appetizing, well-lit, restaurant quality presentation, clean white background`

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          size: '1024x1024',
          quality: 'standard',
          n: 1,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.data && data.data.length > 0) {
        return NextResponse.json({
          success: true,
          imageUrl: data.data[0].url,
          prompt: prompt
        })
      } else {
        throw new Error('No image generated')
      }

    } catch (openaiError) {
      console.error('OpenAI image generation error:', openaiError)
      
      // Fallback to Unsplash food image with search term
      const searchTerm = encodeURIComponent(dishName.split(' ')[0]) // Use first word of dish name
      const fallbackUrl = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&crop=center&q=food,${searchTerm}`
      
      return NextResponse.json({
        success: true,
        imageUrl: fallbackUrl,
        message: 'Using fallback image due to generation error',
        error: openaiError instanceof Error ? openaiError.message : 'OpenAI generation failed'
      })
    }

  } catch (error) {
    console.error('Image generation error:', error)
    
    // Final fallback - generic food image
    return NextResponse.json({
      success: false,
      error: 'Failed to generate dish image',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallbackImageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&crop=center'
    }, { status: 500 })
  }
}