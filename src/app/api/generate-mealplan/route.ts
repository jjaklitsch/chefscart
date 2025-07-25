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

    console.log('Proxying meal plan generation to Cloud Function...')

    // For development, we'll call the local Firebase function
    // In production, this would be the deployed function URL
    const functionUrl = process.env.NODE_ENV === 'production' 
      ? 'https://us-central1-chefscart-e0744.cloudfunctions.net/gptPlan'
      : 'http://127.0.0.1:5001/chefscart-e0744/us-central1/gptPlan'

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        preferences,
        pantryItems: [] // TODO: Extract from pantry photo if provided
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cloud Function error:', errorText)
      throw new Error(`Cloud Function error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Meal plan generated successfully')

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error generating meal plan:', error)
    return NextResponse.json({
      error: 'Failed to generate meal plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}