import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { VoiceTranscriptionResponse } from '../../../../../types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string | null

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg'
    ]
    
    if (!allowedTypes.some(type => audioFile.type.startsWith(type.split('/')[0]))) {
      return NextResponse.json(
        { error: 'Invalid audio file type' },
        { status: 400 }
      )
    }

    // Check file size (max 25MB as per OpenAI limits)
    const maxSizeBytes = 25 * 1024 * 1024 // 25MB
    if (audioFile.size > maxSizeBytes) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // Convert File to the format expected by OpenAI
    const transcriptionRequest: OpenAI.Audio.TranscriptionCreateParams = {
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json', // Get confidence scores and other metadata
      temperature: 0, // Most deterministic output
    }

    // Add language parameter if provided
    if (language) {
      transcriptionRequest.language = language
    }

    const transcription = await openai.audio.transcriptions.create(transcriptionRequest)
    
    const duration = (Date.now() - startTime) / 1000

    // Prepare response with enhanced metadata
    const response: VoiceTranscriptionResponse = {
      text: transcription.text,
      duration,
    }

    // Add language if available (verbose_json format includes this)
    if ('language' in transcription && transcription.language) {
      response.language = transcription.language
    }

    // Add confidence if available (some response formats include this)
    if ('confidence' in transcription && typeof transcription.confidence === 'number') {
      response.confidence = transcription.confidence
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Transcription error:', error)

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      const status = error.status || 500
      const message = error.message || 'OpenAI API error'
      
      return NextResponse.json(
        { 
          error: 'Transcription failed',
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
        error: 'Transcription failed',
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}

// Optionally support GET for endpoint info
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/voice/transcribe',
    method: 'POST',
    description: 'Transcribe audio to text using OpenAI Whisper',
    requirements: {
      audio: 'Audio file (webm, mp4, mpeg, mp3, wav, ogg)',
      language: 'Optional language code (e.g., "en", "es", "fr")'
    },
    limits: {
      maxFileSize: '25MB',
      supportedFormats: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
    }
  })
}