import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as threadHandler } from '../../../apps/web/src/app/api/assistant/thread/route'
import { POST as chatHandler } from '../../../apps/web/src/app/api/assistant/chat/route'
import { POST as toolsHandler } from '../../../apps/web/src/app/api/assistant/tools/route'

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    beta: {
      assistants: {
        list: vi.fn().mockResolvedValue({ data: [] }),
        create: vi.fn().mockResolvedValue({ id: 'asst_test123' })
      },
      threads: {
        create: vi.fn().mockResolvedValue({ id: 'thread_test123' }),
        del: vi.fn().mockResolvedValue({}),
        messages: {
          create: vi.fn().mockResolvedValue({}),
          list: vi.fn().mockResolvedValue({ 
            data: [
              {
                id: 'msg_test123',
                role: 'assistant',
                content: [{ type: 'text', text: { value: 'Test response' } }],
                created_at: Date.now() / 1000,
                metadata: {}
              }
            ] 
          })
        },
        runs: {
          create: vi.fn().mockResolvedValue({ 
            id: 'run_test123',
            status: 'completed',
            thread_id: 'thread_test123',
            assistant_id: 'asst_test123'
          }),
          retrieve: vi.fn().mockResolvedValue({
            id: 'run_test123', 
            status: 'completed'
          }),
          steps: {
            list: vi.fn().mockResolvedValue({ data: [] })
          },
          submitToolOutputs: vi.fn().mockResolvedValue({})
        }
      }
    }
  }))
}))

// Mock environment variables
vi.stubEnv('OPENAI_API_KEY', 'test-api-key')
vi.stubEnv('NEXT_PUBLIC_USE_ASSISTANT_API', 'true')

describe('Assistant API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Thread Management API', () => {
    it('should create a new thread', async () => {
      const request = new NextRequest('http://localhost:3000/api/assistant/thread', {
        method: 'POST',
        body: JSON.stringify({ action: 'create' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await threadHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.threadId).toBe('thread_test123')
    })

    it('should delete a thread', async () => {
      const request = new NextRequest('http://localhost:3000/api/assistant/thread', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', threadId: 'thread_test123' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await threadHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should get thread messages', async () => {
      const request = new NextRequest('http://localhost:3000/api/assistant/thread', {
        method: 'POST',
        body: JSON.stringify({ action: 'get_messages', threadId: 'thread_test123' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await threadHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.messages)).toBe(true)
    })

    it('should handle invalid actions', async () => {
      const request = new NextRequest('http://localhost:3000/api/assistant/thread', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid_action' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await threadHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('Chat API', () => {
    it('should process a chat message', async () => {
      const request = new NextRequest('http://localhost:3000/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'I want to plan dinner for this week',
          context: {
            preferences: {},
            conversationHistory: [],
            currentStep: 'greeting',
            completedSteps: []
          }
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.threadId).toBeDefined()
      expect(data.response).toBeDefined()
    })

    it('should handle missing message', async () => {
      const request = new NextRequest('http://localhost:3000/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ message: '' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await chatHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('Tools API', () => {
    it('should handle extract_preferences function', async () => {
      const request = new NextRequest('http://localhost:3000/api/assistant/tools', {
        method: 'POST',
        body: JSON.stringify({
          function_name: 'extract_preferences',
          arguments: {
            selectedMealTypes: ['dinner'],
            maxCookTime: 30,
            diets: ['vegetarian']
          },
          call_id: 'test_call_123'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await toolsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.success).toBe(true)
      expect(data.result.extracted).toBeDefined()
    })

    it('should handle generate_meal_options function', async () => {
      // Mock fetch for meal generation
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          mealPlan: {
            recipes: [
              {
                id: 'recipe1',
                title: 'Pasta Primavera',
                description: 'Fresh vegetable pasta',
                ingredients: [],
                instructions: [],
                nutrition: { calories: 450, protein: 15, carbs: 60, fat: 12, fiber: 8, sugar: 10 },
                estimatedCost: 12.50,
                cookTime: 25,
                prepTime: 10,
                servings: 4,
                difficulty: 'easy',
                cuisine: 'italian',
                tags: ['vegetarian']
              }
            ]
          }
        })
      }) as any

      const request = new NextRequest('http://localhost:3000/api/assistant/tools', {
        method: 'POST',
        body: JSON.stringify({
          function_name: 'generate_meal_options',
          arguments: {
            preferences: {
              selectedMealTypes: ['dinner'],
              diets: ['vegetarian'],
              maxCookTime: 30
            },
            requestedCount: 5
          },
          call_id: 'test_call_124'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await toolsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.success).toBe(true)
      expect(Array.isArray(data.result.meals)).toBe(true)
    })

    it('should handle update_progress function', async () => {
      const request = new NextRequest('http://localhost:3000/api/assistant/tools', {
        method: 'POST',
        body: JSON.stringify({
          function_name: 'update_progress',
          arguments: {
            currentStep: 'meal_types',
            completedSteps: ['greeting'],
            readyForMealGeneration: false,
            conversationComplete: false
          },
          call_id: 'test_call_125'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await toolsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.success).toBe(true)
    })

    it('should handle unknown functions', async () => {
      const request = new NextRequest('http://localhost:3000/api/assistant/tools', {
        method: 'POST',
        body: JSON.stringify({
          function_name: 'unknown_function',
          arguments: {},
          call_id: 'test_call_126'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await toolsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.success).toBe(false)
      expect(data.result.error).toContain('Unknown function')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock a network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/assistant/tools', {
        method: 'POST',
        body: JSON.stringify({
          function_name: 'generate_meal_options',
          arguments: {
            preferences: { selectedMealTypes: ['dinner'] }
          }
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await toolsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.success).toBe(false)
      expect(data.result.error).toContain('Meal generation failed')
    })
  })
})

describe('Assistant Service Error Handling', () => {
  it('should validate API key', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    
    const { assistantService } = await import('../../../apps/web/lib/openai-assistant')
    
    await expect(assistantService.getOrCreateAssistant()).rejects.toThrow('OpenAI API key is not configured')
  })

  it('should handle OpenAI API errors', async () => {
    // Mock OpenAI to throw an error
    const mockOpenAI = {
      beta: {
        assistants: {
          list: vi.fn().mockRejectedValue(new Error('API Error'))
        }
      }
    }

    vi.doMock('openai', () => ({
      default: vi.fn().mockImplementation(() => mockOpenAI)
    }))

    const { assistantService } = await import('../../../apps/web/lib/openai-assistant')
    
    await expect(assistantService.getOrCreateAssistant()).rejects.toThrow()
  })
})