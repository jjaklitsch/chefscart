import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { VoiceSynthesisRequest } from '../../../../types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body: VoiceSynthesisRequest = await request.json()
    const { text, voice = 'alloy', speed = 1.0 } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      )
    }

    // Validate text length (OpenAI limit is 4096 characters)
    if (text.length > 4096) {
      return NextResponse.json(
        { error: 'Text too long. Maximum length is 4096 characters.' },
        { status: 400 }
      )
    }

    // Validate voice parameter
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    if (!validVoices.includes(voice)) {
      return NextResponse.json(
        { error: `Invalid voice. Must be one of: ${validVoices.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate speed parameter
    if (speed < 0.25 || speed > 4.0) {
      return NextResponse.json(
        { error: 'Speed must be between 0.25 and 4.0' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // Create speech synthesis request
    const speechResponse = await openai.audio.speech.create({
      model: 'tts-1', // Use tts-1 for faster response, tts-1-hd for higher quality
      voice: voice as OpenAI.Audio.SpeechCreateParams['voice'],
      input: text,
      speed: speed,
      response_format: 'mp3', // mp3 for good compression and broad compatibility
    })

    const processingTime = (Date.now() - startTime) / 1000

    // Convert the response to ArrayBuffer
    const arrayBuffer = await speechResponse.arrayBuffer()

    // Create response with proper headers
    const response = new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': arrayBuffer.byteLength.toString(),
        'X-Processing-Time': processingTime.toString(),
        'X-Voice-Used': voice,
        'X-Speed-Used': speed.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })

    return response

  } catch (error) {
    console.error('Speech synthesis error:', error)

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      const status = error.status || 500
      const message = error.message || 'OpenAI API error'
      
      return NextResponse.json(
        { 
          error: 'Speech synthesis failed',
          details: message,
          code: error.code 
        },
        { status }
      )
    }

    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        error: 'Speech synthesis failed',
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}

// Support GET for endpoint info
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/voice/synthesize',
    method: 'POST',
    description: 'Convert text to speech using OpenAI TTS',
    parameters: {
      text: 'Text to convert to speech (required, max 4096 characters)',
      voice: 'Voice to use (optional, default: "alloy")',
      speed: 'Speech speed (optional, default: 1.0, range: 0.25-4.0)'
    },
    availableVoices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    responseFormat: 'audio/mpeg',
    limits: {
      maxTextLength: 4096,
      speedRange: '0.25 - 4.0',
      model: 'tts-1'
    }
  })
}