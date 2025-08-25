import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '../route'
import { UserPreferences } from '../../../../../types/index'

// Mock Supabase
vi.mock('../../../../../lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => {
    const mockQuery = {
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn(() => ({
        data: [
                {
                  id: '1',
                  name: 'Grilled Chicken Salad',
                  description: 'Healthy grilled chicken with mixed greens',
                  cuisine: 'american',
                  dietary_tags: ['gluten-free', 'low-carb'],
                  cook_time_minutes: 15,
                  prep_time_minutes: 10,
                  total_time_minutes: 25,
                  servings: 2,
                  difficulty_level: 'easy',
                  ingredients: [
                    { name: 'chicken breast', amount: 1, unit: 'lb', category: 'protein' },
                    { name: 'mixed greens', amount: 4, unit: 'cups', category: 'vegetable' }
                  ],
                  instructions: ['Grill chicken', 'Toss with greens'],
                  nutrition: {
                    calories: 350,
                    protein: 35,
                    carbs: 8,
                    fat: 18,
                    fiber: 4,
                    sugar: 3
                  },
                  image_url: 'https://example.com/chicken-salad.jpg',
                  created_at: '2024-01-01T00:00:00.000Z',
                  updated_at: '2024-01-01T00:00:00.000Z'
                },
                {
                  id: '2',
                  name: 'Pasta Carbonara',
                  description: 'Classic Italian pasta dish',
                  cuisine: 'italian',
                  dietary_tags: [],
                  cook_time_minutes: 20,
                  prep_time_minutes: 5,
                  total_time_minutes: 25,
                  servings: 4,
                  difficulty_level: 'medium',
                  ingredients: [
                    { name: 'pasta', amount: 1, unit: 'lb', category: 'grain' },
                    { name: 'eggs', amount: 3, unit: 'whole', category: 'protein' },
                    { name: 'bacon', amount: 4, unit: 'strips', category: 'meat' }
                  ],
                  instructions: ['Cook pasta', 'Mix with eggs and bacon'],
                  nutrition: {
                    calories: 520,
                    protein: 22,
                    carbs: 45,
                    fat: 28,
                    fiber: 2,
                    sugar: 2
                  },
                  created_at: '2024-01-01T00:00:00.000Z',
                  updated_at: '2024-01-01T00:00:00.000Z'
                }
              ],
              error: null
        }))
      }

    return {
      from: vi.fn(() => ({
        select: vi.fn(() => mockQuery)
      }))
    }
  })
}))

describe('/api/recommend-meals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should return meal recommendations based on user preferences', async () => {
      const preferences: UserPreferences = {
        diets: ['gluten-free'],
        allergies: [],
        maxCookTime: 30,
        preferredCuisines: ['american'],
        cookingSkillLevel: 'beginner',
        mealsPerWeek: 5,
        peoplePerMeal: 2,
        mealTypes: [],
        organicPreference: 'no_preference'
      }

      const request = {
        json: async () => ({ preferences, limit: 10 })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.meals)).toBe(true)
      expect(data.total_count).toBeGreaterThan(0)
      expect(data.meals[0]).toHaveProperty('name')
      expect(data.meals[0]).toHaveProperty('cuisine')
    })

    it('should return empty results when no meals match preferences', async () => {
      const preferences: UserPreferences = {
        diets: ['vegan'],
        allergies: ['chicken', 'bacon'],
        maxCookTime: 10,
        mealsPerWeek: 5,
        peoplePerMeal: 2,
        mealTypes: [],
        organicPreference: 'no_preference'
      }

      const request = {
        json: async () => ({ preferences, limit: 10 })
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.meals).toHaveLength(0)
      expect(data.total_count).toBe(0)
    })

    it('should return error when preferences are missing', async () => {
      const request = {
        json: async () => ({})
      } as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('User preferences are required')
    })
  })

  describe('GET', () => {
    it('should handle query parameters correctly', async () => {
      const url = 'http://localhost:3000/api/recommend-meals?diets=gluten-free&maxCookTime=30&cuisines=american&skillLevel=beginner&limit=5'
      const request = {
        url
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.meals)).toBe(true)
    })

    it('should handle empty query parameters', async () => {
      const url = 'http://localhost:3000/api/recommend-meals'
      const request = {
        url
      } as NextRequest

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})