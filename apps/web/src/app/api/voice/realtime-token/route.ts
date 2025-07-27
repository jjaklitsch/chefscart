import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Create a session token for the realtime API
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy'
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI Realtime API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to create realtime session' },
        { status: 500 }
      )
    }

    const sessionData = await response.json()
    
    return NextResponse.json({
      token: sessionData.client_secret.value,
      url: 'wss://api.openai.com/v1/realtime',
      expires_at: sessionData.client_secret.expires_at
    })

  } catch (error) {
    console.error('Error creating realtime session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}