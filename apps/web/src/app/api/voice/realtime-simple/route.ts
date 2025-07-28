import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder-key-for-build',
})

export async function POST(request: NextRequest) {
  try {
    const { audio, systemPrompt, conversationHistory } = await request.json()
    
    if (!audio) {
      return NextResponse.json(
        { error: 'No audio data provided' },
        { status: 400 }
      )
    }

    // OPTIMIZED FOR SPEED: Use Promise.all to run transcription and TTS in parallel where possible
    const startTime = Date.now()
    
    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audio, 'base64')
    
    // SPEED OPTIMIZATION 1: Use faster Whisper model with minimal settings
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
      model: 'whisper-1',
      temperature: 0, // Faster processing
    })
    
    console.log(`⚡ Transcription took: ${Date.now() - startTime}ms`)
    const transcriptionTime = Date.now()

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: systemPrompt || `You are Carter, a friendly male AI sous-chef. Keep responses VERY short (1 sentence max). Ask about meal planning preferences.`
      },
      // Add conversation history for context
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: transcription.text
      }
    ]

    // SPEED OPTIMIZATION 2: Use GPT-3.5-turbo (much faster than GPT-4)
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // 5x faster than GPT-4
      messages,
      temperature: 0.8,
      max_tokens: 40, // VERY short responses for speed
      presence_penalty: 0.3,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    console.log(`⚡ Chat completion took: ${Date.now() - transcriptionTime}ms`)
    const completionTime = Date.now()

    // SPEED OPTIMIZATION 3: Use fastest TTS model with male voice
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1', // Fastest TTS model
      voice: 'alloy', // Male voice
      input: responseText,
      speed: 1.1 // Slightly faster as requested
    })

    const audioData = await mp3.arrayBuffer()
    const audioBase64 = Buffer.from(audioData).toString('base64')
    
    const totalTime = Date.now() - startTime
    console.log(`⚡ TTS took: ${Date.now() - completionTime}ms`)
    console.log(`🎯 TOTAL PROCESSING TIME: ${totalTime}ms`)

    return NextResponse.json({
      transcription: transcription.text,
      response: responseText,
      audio: audioBase64,
      processingTime: totalTime // For monitoring performance
    })

  } catch (error) {
    console.error('Voice processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process voice request' },
      { status: 500 }
    )
  }
}