import { NextRequest, NextResponse } from 'next/server'
import { assistantService, AssistantResponse } from '../../../../../lib/openai-assistant'
import { UserPreferences, Recipe } from '../../../../../types'
import { ConversationProgress } from '../../../../../types/assistant'

interface ChatRequest {
  message: string
  threadId?: string
  context?: {
    preferences?: Partial<UserPreferences>
    conversationHistory?: any[]
    currentStep?: string
    completedSteps?: string[]
  }
}

interface ExtractedData {
  preferences?: Partial<UserPreferences>
  progress?: ConversationProgress
  meals?: Recipe[]
  isComplete?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, threadId, context } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Message is required'
      }, { status: 400 })
    }

    let currentThreadId = threadId

    // Create new thread if none provided
    if (!currentThreadId) {
      currentThreadId = await assistantService.createThread()
    }

    // Add user message to thread
    await assistantService.addMessage(currentThreadId, message)

    // Run the assistant
    const run = await assistantService.runAssistant(currentThreadId)

    // Wait for completion and handle tool calls
    let completedRun = await assistantService.waitForRunCompletion(currentThreadId, run.id)

    // Handle tool calls if present
    while (completedRun.status === 'requires_action' && completedRun.required_action?.type === 'submit_tool_outputs') {
      const toolCalls = completedRun.required_action.submit_tool_outputs.tool_calls
      await assistantService.handleToolCalls(currentThreadId, run.id, toolCalls)
      completedRun = await assistantService.waitForRunCompletion(currentThreadId, run.id)
    }

    if (completedRun.status !== 'completed') {
      throw new Error(`Assistant run failed with status: ${completedRun.status}`)
    }

    // Get the latest messages
    const messages = await assistantService.getMessages(currentThreadId)
    const latestMessage = messages[0] // Most recent message

    // Extract assistant response
    const assistantContent = latestMessage?.content[0]?.type === 'text' 
      ? latestMessage.content[0].text.value 
      : "I'm sorry, I couldn't process that request."

    // Parse any tool call results from the run
    const extractedData = await parseToolCallResults(completedRun, currentThreadId)

    // Format response
    const response: AssistantResponse = {
      messages: [{
        id: latestMessage?.id || `msg-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(latestMessage?.created_at ? latestMessage.created_at * 1000 : Date.now())
      }],
      ...(extractedData.preferences && { extractedPreferences: extractedData.preferences }),
      ...(extractedData.meals && { generatedMeals: extractedData.meals }),
      ...(extractedData.progress && { conversationProgress: extractedData.progress }),
      ...(extractedData.isComplete !== undefined && { isComplete: extractedData.isComplete })
    }

    return NextResponse.json({
      success: true,
      threadId: currentThreadId,
      response: assistantContent,
      extractedData: extractedData.preferences || {},
      generatedMeals: extractedData.meals || [],
      conversationProgress: extractedData.progress,
      conversationFlow: extractedData.progress ? {
        currentStep: extractedData.progress.currentStep,
        completedSteps: extractedData.progress.completedSteps,
        isComplete: extractedData.progress.conversationComplete || false
      } : undefined,
      messages: response.messages,
      isComplete: extractedData.isComplete || false
    })

  } catch (error) {
    console.error('Assistant chat error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function parseToolCallResults(run: any, threadId: string): Promise<ExtractedData> {
  const result: ExtractedData = {
    preferences: {},
    progress: {
      currentStep: 'greeting',
      completedSteps: [],
      readyForMealGeneration: false,
      conversationComplete: false,
      totalSteps: 7,
      progressPercentage: 0
    },
    meals: [],
    isComplete: false
  }

  try {
    // Get run steps to see tool calls
    const runSteps = await assistantService.openai.beta.threads.runs.steps.list(threadId, run.id)
    
    for (const step of runSteps.data) {
      if (step.type === 'tool_calls' && step.step_details.type === 'tool_calls') {
        const toolCalls = step.step_details.tool_calls

        for (const toolCall of toolCalls) {
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name
            const functionOutput = toolCall.function.output

            try {
              const output = JSON.parse(functionOutput || '{}')

              switch (functionName) {
                case 'extract_preferences':
                  if (output.success && output.extracted) {
                    result.preferences = { ...result.preferences, ...output.extracted }
                  }
                  break

                case 'generate_meal_options':
                  if (output.success && output.meals) {
                    result.meals = output.meals
                  }
                  break

                case 'update_progress':
                  if (output.success && output.progress) {
                    result.progress = { ...result.progress, ...output.progress }
                  }
                  break

                case 'finalize_meal_plan':
                  if (output.success) {
                    result.isComplete = true
                    result.progress!.conversationComplete = true
                  }
                  break
              }
            } catch (parseError) {
              console.warn(`Failed to parse tool output for ${functionName}:`, parseError)
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to parse tool call results:', error)
  }

  return result
}

// Alternative endpoint for compatibility with existing system
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'GET method not supported for chat endpoint. Use POST instead.'
  }, { status: 405 })
}