import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Track conversation state by thread
const conversationState = new Map<string, {
  collectedInfo: any
  currentStep: string
  completedSteps: string[]
}>()

export async function POST(request: NextRequest) {
  try {
    const { audio, threadId, preferences = {}, conversationHistory = [] } = await request.json()
    
    // Allow empty audio for testing/debugging purposes
    if (!audio && !threadId?.includes('test')) {
      return NextResponse.json(
        { error: 'No audio data provided' },
        { status: 400 }
      )
    }
    
    // Handle test requests with empty audio
    if (!audio || audio.trim() === '') {
      console.log('Processing test request or empty audio')
      const testResponse = "I'm listening! Could you speak a bit louder or closer to the microphone?"
      
      // Generate speech for test response
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: testResponse,
        speed: 1.1
      })

      const audioData = await mp3.arrayBuffer()
      const audioBase64 = Buffer.from(audioData).toString('base64')

      return NextResponse.json({
        transcription: '[Test Request]',
        response: testResponse,
        audio: audioBase64,
        threadId: threadId || `thread_${Date.now()}`,
        collectedInfo: preferences,
        allRequiredCollected: false
      })
    }

    // Use existing thread or create new one
    const currentThreadId = threadId || `thread_${Date.now()}`
    
    // Get or initialize conversation state
    const state = conversationState.get(currentThreadId) || {
      collectedInfo: { ...preferences },
      currentStep: 'initial',
      completedSteps: []
    }

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audio, 'base64')
    
    // Transcribe audio using Whisper (fast)
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
      model: 'whisper-1',
      prompt: 'This is a conversation about meal planning preferences.'
    })

    // Determine what information we still need
    const requiredInfo = {
      mealTypes: state.collectedInfo.mealTypes || state.collectedInfo.selectedMealTypes,
      dietaryRestrictions: state.collectedInfo.diets !== undefined,
      cookingTime: state.collectedInfo.maxCookTime !== undefined,
      cuisines: state.collectedInfo.preferredCuisines !== undefined
    }

    const allRequiredCollected = requiredInfo.mealTypes && 
                                 requiredInfo.cookingTime // Only meal types and cooking time are truly required

    // Build focused system prompt
    const systemPrompt = `You are Carter, a friendly male AI sous-chef for ChefsCart. You're having a natural voice conversation to gather meal planning preferences.

COLLECTED INFORMATION:
${JSON.stringify(state.collectedInfo, null, 2)}

CONVERSATION HISTORY:
${conversationHistory.map((m: any) => `${m.role}: ${m.content}`).join('\n')}

REQUIRED INFORMATION STATUS:
- Meal Types: ${requiredInfo.mealTypes ? '✓ Collected' : '✗ Need to collect'}
- Cooking Time: ${requiredInfo.cookingTime ? '✓ Collected' : '✗ Need to collect'}
- Dietary Restrictions: ${requiredInfo.dietaryRestrictions ? '✓ Collected' : 'Optional'}
- Cuisines: ${requiredInfo.cuisines ? '✓ Collected' : 'Optional'}

CONVERSATION RULES:
1. Be conversational and natural - this is voice, not text
2. Keep responses VERY SHORT (1 sentence max) for fast voice processing
3. If required info is missing, ask about it naturally
4. Don't repeat questions about info already collected
5. Once you have meal types and cooking time, you can wrap up
6. Extract preferences from the user's response and include in your analysis
7. You are Carter, a friendly male AI sous-chef
8. PRIORITY: Speed over completeness - ask one thing at a time

CURRENT TASK: ${allRequiredCollected ? 
  'All required info collected! Confirm and wrap up the conversation.' : 
  !requiredInfo.mealTypes ? 'Find out what meals they want planned' :
  !requiredInfo.cookingTime ? 'Ask about cooking time preferences' :
  'Gather any additional preferences naturally'}

Respond naturally to what the user just said while guiding toward collecting needed information.`

    // Get quick response using GPT-4-turbo
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcription.text }
      ],
      temperature: 0.7,
      max_tokens: 60, // Shorter responses for faster processing
      functions: [{
        name: 'extract_preferences',
        description: 'Extract meal planning preferences from conversation',
        parameters: {
          type: 'object',
          properties: {
            mealTypes: { type: 'array', items: { type: 'string' } },
            maxCookTime: { type: 'number' },
            diets: { type: 'array', items: { type: 'string' } },
            preferredCuisines: { type: 'array', items: { type: 'string' } },
            otherPreferences: { type: 'object' }
          }
        }
      }],
      function_call: 'auto'
    })

    const responseText = completion.choices[0]?.message?.content || "I didn't catch that. Could you repeat?"

    // Extract any preferences mentioned
    if (completion.choices[0]?.message?.function_call) {
      try {
        const extractedData = JSON.parse(completion.choices[0].message.function_call.arguments)
        
        // Update collected info
        Object.entries(extractedData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (key === 'mealTypes' && !state.collectedInfo.selectedMealTypes) {
              state.collectedInfo.selectedMealTypes = value
            } else {
              state.collectedInfo[key] = value
            }
          }
        })
        
        // Update conversation state
        conversationState.set(currentThreadId, state)
      } catch (e) {
        console.error('Failed to parse extracted data:', e)
      }
    }

    // Generate speech (fast TTS)
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1', // Faster model
      voice: 'alloy',
      input: responseText,
      speed: 1.1
    })

    const audioData = await mp3.arrayBuffer()
    const audioBase64 = Buffer.from(audioData).toString('base64')

    return NextResponse.json({
      transcription: transcription.text,
      response: responseText,
      audio: audioBase64,
      threadId: currentThreadId,
      collectedInfo: state.collectedInfo,
      allRequiredCollected
    })

  } catch (error) {
    console.error('Voice processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process voice request' },
      { status: 500 }
    )
  }
}