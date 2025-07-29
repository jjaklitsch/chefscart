import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { recipes } = await request.json()

    if (!recipes || !Array.isArray(recipes)) {
      return NextResponse.json({
        error: 'Invalid recipes array'
      }, { status: 400 })
    }

    console.log(`Generating images for ${recipes.length} recipes...`)

    // Call Firebase function for batch image generation
    const functionUrl = process.env.NODE_ENV === 'production' 
      ? 'https://us-central1-chefscart-e0744.cloudfunctions.net/generateDishImageBatch'
      : 'http://127.0.0.1:5001/chefscart-e0744/us-central1/generateDishImageBatch'

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipes })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Image generation error:', errorText)
      throw new Error(`Image generation error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error generating batch images:', error)
    return NextResponse.json({
      error: 'Failed to generate images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}