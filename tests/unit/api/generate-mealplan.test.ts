import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/generate-mealplan/route'
import { NextRequest } from 'next/server'
import { UserPreferences } from '@/types'

describe('/api/generate-mealplan API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockUserPreferences: UserPreferences = {
    mealsPerWeek: 5,
    peoplePerMeal: 2,
    mealTypes: [
      { type: 'dinner', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }
    ],
    diets: ['vegetarian'],
    allergies: ['nuts'],
    avoidIngredients: ['mushrooms'],
    organicPreference: 'preferred',
    maxCookTime: 30,
    cookingSkillLevel: 'intermediate',
    preferredCuisines: ['italian', 'mexican'],
    preferredRetailers: ['instacart']
  }

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/generate-mealplan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
  }

  describe('Valid Requests', () => {
    it('should generate meal plan with valid preferences', async () => {
      const request = createMockRequest({
        preferences: mockUserPreferences,
        zipCode: '10001'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        mealPlan: expect.objectContaining({
          id: expect.any(String),
          recipes: expect.any(Array),
          backupRecipes: expect.any(Array),
          subtotalEstimate: expect.any(Number)
        })
      })
    })

    it('should return recipes matching user preferences', async () => {
      const request = createMockRequest({
        preferences: mockUserPreferences,
        zipCode: '10001'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mealPlan.recipes).toHaveLength(5) // mealsPerWeek
      
      // Check that recipes respect dietary restrictions
      data.mealPlan.recipes.forEach((recipe: any) => {
        expect(recipe).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          ingredients: expect.any(Array),
          cookTime: expect.any(Number),
          estimatedCost: expect.any(Number)
        })
        
        // Cook time should be within max limit
        expect(recipe.cookTime + recipe.prepTime).toBeLessThanOrEqual(mockUserPreferences.maxCookTime)
      })
    })

    it('should include backup recipes', async () => {
      const request = createMockRequest({
        preferences: mockUserPreferences,
        zipCode: '10001'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mealPlan.backupRecipes).toBeInstanceOf(Array)
      expect(data.mealPlan.backupRecipes.length).toBeGreaterThan(0)
    })

    it('should calculate cost estimates', async () => {
      const request = createMockRequest({
        preferences: mockUserPreferences,
        zipCode: '10001'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mealPlan.subtotalEstimate).toBeGreaterThan(0)
      
      // Verify individual recipe costs
      data.mealPlan.recipes.forEach((recipe: any) => {
        expect(recipe.estimatedCost).toBeGreaterThan(0)
      })
    })
  })

  describe('Invalid Requests', () => {
    it('should reject requests without preferences', async () => {
      const request = createMockRequest({
        zipCode: '10001'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('preferences')
    })

    it('should reject requests without zipCode', async () => {
      const request = createMockRequest({
        preferences: mockUserPreferences
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('zipCode')
    })

    it('should reject malformed preferences', async () => {
      const invalidPreferences = {
        mealsPerWeek: 'invalid',
        mealTypes: 'not an array'
      }

      const request = createMockRequest({
        preferences: invalidPreferences,
        zipCode: '10001'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should handle empty meal types', async () => {
      const preferencesWithEmptyMealTypes = {
        ...mockUserPreferences,
        mealTypes: []
      }

      const request = createMockRequest({
        preferences: preferencesWithEmptyMealTypes,
        zipCode: '10001'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('meal types')
    })
  })

  describe('Preference Validation', () => {
    it('should validate mealsPerWeek range', async () => {
      const invalidPreferences = {
        ...mockUserPreferences,
        mealsPerWeek: 0
      }

      const request = createMockRequest({
        preferences: invalidPreferences,
        zipCode: '10001'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('mealsPerWeek')
    })

    it('should validate cookingSkillLevel values', async () => {
      const invalidPreferences = {
        ...mockUserPreferences,
        cookingSkillLevel: 'expert' as any
      }

      const request = createMockRequest({
        preferences: invalidPreferences,
        zipCode: '10001'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('cookingSkillLevel')
    })

    it('should validate organicPreference values', async () => {
      const invalidPreferences = {
        ...mockUserPreferences,
        organicPreference: 'always' as any
      }

      const request = createMockRequest({
        preferences: invalidPreferences,
        zipCode: '10001'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('organicPreference')
    })
  })

  describe('AI Integration', () => {
    it('should handle AI service availability', async () => {
      const request = createMockRequest({
        preferences: mockUserPreferences,
        zipCode: '10001'
      })

      const response = await POST(request)
      
      // Should either succeed or fail gracefully
      if (response.status === 200) {
        const data = await response.json()
        expect(data.mealPlan).toBeDefined()
      } else {
        expect(response.status).toBe(503)
        const data = await response.json()
        expect(data.error).toContain('service')
      }
    })

    it('should timeout gracefully for slow AI responses', async () => {
      const request = createMockRequest({
        preferences: mockUserPreferences,
        zipCode: '10001'
      })

      const start = Date.now()
      const response = await POST(request)
      const end = Date.now()

      // Should respond within reasonable time
      expect(end - start).toBeLessThan(30000) // 30 seconds max
      
      if (response.status !== 200) {
        const data = await response.json()
        expect(data.error).toBeDefined()
      }
    }, 35000)
  })

  describe('Response Format', () => {
    it('should return consistent meal plan structure', async () => {
      const request = createMockRequest({
        preferences: mockUserPreferences,
        zipCode: '10001'
      })

      const response = await POST(request)
      
      if (response.status === 200) {
        const data = await response.json()
        
        expect(data.mealPlan).toMatchObject({
          id: expect.any(String),
          recipes: expect.any(Array),
          backupRecipes: expect.any(Array),
          subtotalEstimate: expect.any(Number),
          status: 'draft'
        })

        // Verify recipe structure
        if (data.mealPlan.recipes.length > 0) {
          expect(data.mealPlan.recipes[0]).toMatchObject({
            id: expect.any(String),
            title: expect.any(String),
            description: expect.any(String),
            ingredients: expect.any(Array),
            nutrition: expect.any(Object),
            estimatedCost: expect.any(Number),
            cookTime: expect.any(Number),
            prepTime: expect.any(Number),
            servings: expect.any(Number),
            difficulty: expect.stringMatching(/easy|medium|hard/),
            cuisine: expect.any(String)
          })
        }
      }
    })

    it('should include proper error responses', async () => {
      const request = createMockRequest({})

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toMatchObject({
        error: expect.any(String)
      })
    })
  })

  describe('Diet and Allergy Handling', () => {
    it('should respect vegetarian preferences', async () => {
      const vegPreferences = {
        ...mockUserPreferences,
        diets: ['vegetarian']
      }

      const request = createMockRequest({
        preferences: vegPreferences,
        zipCode: '10001'
      })

      const response = await POST(request)
      
      if (response.status === 200) {
        const data = await response.json()
        
        // Check that no meat ingredients are included
        data.mealPlan.recipes.forEach((recipe: any) => {
          const ingredientNames = recipe.ingredients.map((ing: any) => ing.name.toLowerCase())
          const meatKeywords = ['chicken', 'beef', 'pork', 'fish', 'turkey', 'lamb']
          
          const hasMeat = meatKeywords.some(meat => 
            ingredientNames.some((name: string) => name.includes(meat))
          )
          expect(hasMeat).toBe(false)
        })
      }
    })

    it('should avoid allergens', async () => {
      const allergyPreferences = {
        ...mockUserPreferences,
        allergies: ['nuts', 'dairy']
      }

      const request = createMockRequest({
        preferences: allergyPreferences,
        zipCode: '10001'
      })

      const response = await POST(request)
      
      if (response.status === 200) {
        const data = await response.json()
        
        data.mealPlan.recipes.forEach((recipe: any) => {
          const ingredientNames = recipe.ingredients.map((ing: any) => ing.name.toLowerCase())
          const allergens = ['nuts', 'peanut', 'almond', 'walnut', 'milk', 'cheese', 'butter']
          
          const hasAllergen = allergens.some(allergen => 
            ingredientNames.some((name: string) => name.includes(allergen))
          )
          expect(hasAllergen).toBe(false)
        })
      }
    })
  })

  describe('Performance and Reliability', () => {
    it('should handle high concurrent load', async () => {
      const requests = Array.from({ length: 5 }, () => 
        createMockRequest({
          preferences: mockUserPreferences,
          zipCode: '10001'
        })
      )

      const promises = requests.map(request => POST(request))
      const responses = await Promise.all(promises)

      responses.forEach(response => {
        expect([200, 503]).toContain(response.status)
      })
    })

    it('should implement proper error handling', async () => {
      const request = createMockRequest({
        preferences: null,
        zipCode: '10001'
      })

      const response = await POST(request)
      
      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(response.status).toBeLessThan(500)
      
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })
})