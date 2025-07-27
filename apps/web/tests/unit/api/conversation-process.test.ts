import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock OpenAI
const mockCreate = vi.fn()
const mockOpenAI = {
  chat: {
    completions: {
      create: mockCreate
    }
  }
}

vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI)
}))

// Import after mocking
const { POST } = await import('../../../src/app/api/conversation/process/route')

describe('/api/conversation/process', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process natural language and extract structured data', async () => {
    // Mock OpenAI response
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: "I understand you'd like dinner recipes for 2 people. Let me help you with that!",
          tool_calls: [{
            id: 'call_123',
            type: 'function',
            function: {
              name: 'extract_preferences',
              arguments: JSON.stringify({
                mealTypes: ['dinner'],
                peoplePerMeal: 2,
                preferredCuisines: []
              })
            }
          }]
        }
      }]
    })

    const request = new NextRequest('http://localhost:3000/api/conversation/process', {
      method: 'POST',
      body: JSON.stringify({
        message: "I want dinner recipes for 2 people"
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('response')
    expect(data).toHaveProperty('extractedData')
    expect(data.extractedData).toMatchObject({
      mealTypes: ['dinner'],
      peoplePerMeal: 2
    })
  })

  it('should handle missing message', async () => {
    const request = new NextRequest('http://localhost:3000/api/conversation/process', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Message is required')
  })

  it('should handle extraction failure gracefully', async () => {
    // Mock OpenAI response without tool calls
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: "I'd be happy to help you with meal planning!",
          tool_calls: null
        }
      }]
    })

    const request = new NextRequest('http://localhost:3000/api/conversation/process', {
      method: 'POST',
      body: JSON.stringify({
        message: "Hello there!"
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.response).toBe("I'd be happy to help you with meal planning!")
    expect(data.extractedData).toEqual({})
  })

  it('should handle OpenAI API errors', async () => {
    mockCreate.mockRejectedValue(new Error('API quota exceeded'))

    const request = new NextRequest('http://localhost:3000/api/conversation/process', {
      method: 'POST',
      body: JSON.stringify({
        message: "I want dinner recipes"
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to process conversation')
  })
})