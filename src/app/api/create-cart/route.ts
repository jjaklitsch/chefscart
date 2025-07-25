import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planId, userId } = body

    if (!planId || !userId) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 })
    }

    console.log('Creating Instacart cart via Cloud Function...')

    // For development, we'll call the local Firebase function
    // In production, this would be the deployed function URL
    const functionUrl = process.env.NODE_ENV === 'production' 
      ? 'https://us-central1-chefscart-e0744.cloudfunctions.net/createList'
      : 'http://127.0.0.1:5001/chefscart-e0744/us-central1/createList'

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId,
        userId
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cloud Function error:', errorText)
      throw new Error(`Cloud Function error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Cart created successfully')

    // Also send confirmation email if we have an email
    try {
      const emailFunctionUrl = process.env.NODE_ENV === 'production' 
        ? 'https://us-central1-chefscart-e0744.cloudfunctions.net/emailSend'
        : 'http://127.0.0.1:5001/chefscart-e0744/us-central1/emailSend'

      await fetch(emailFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listId: data.listId,
          email: 'user@example.com', // TODO: Get actual user email
          planId
        })
      })
    } catch (emailError) {
      console.warn('Failed to send confirmation email:', emailError)
      // Don't fail the whole request if email fails
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error creating cart:', error)
    return NextResponse.json({
      error: 'Failed to create cart',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}