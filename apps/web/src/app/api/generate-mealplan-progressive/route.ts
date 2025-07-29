import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, preferences, zipCode } = body

    if (!userId || !preferences) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 })
    }

    console.log('Starting progressive meal plan generation...')

    // Step 1: Generate basic recipes quickly (no images)
    const functionUrl = process.env.NODE_ENV === 'production' 
      ? 'https://us-central1-chefscart-e0744.cloudfunctions.net/gptPlanProgressive'
      : 'http://127.0.0.1:5001/chefscart-e0744/us-central1/gptPlanProgressive'

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        preferences,
        pantryItems: [],
        phase: 'basic' // Only generate basic recipe data
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cloud Function error:', errorText)
      throw new Error(`Cloud Function error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Basic meal plan generated successfully')

    // Return immediately with basic data - images will load progressively
    return NextResponse.json({
      ...data,
      mealPlan: {
        ...data.mealPlan,
        recipes: data.mealPlan.recipes.map((recipe: any) => ({
          ...recipe,
          imageUrl: null, // Images will load separately
          imageLoading: true
        }))
      }
    })

  } catch (error) {
    console.error('Error generating progressive meal plan:', error)
    return NextResponse.json({
      error: 'Failed to generate meal plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}