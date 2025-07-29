import { Request, Response } from 'firebase-functions'
import { getFirestore } from 'firebase-admin/firestore'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const db = getFirestore()

// Optimized function schema for fast recipe generation (no images)
const RECIPE_GENERATION_FUNCTION = {
  name: 'generate_recipes',
  description: 'Generate a collection of recipes for meal planning',
  parameters: {
    type: 'object',
    properties: {
      recipes: {
        type: 'array',
        description: 'Array of recipe objects',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique recipe identifier' },
            title: { type: 'string', description: 'Recipe name' },
            description: { type: 'string', description: 'Brief recipe description' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  amount: { type: 'number' },
                  unit: { type: 'string' },
                  category: { type: 'string' }
                },
                required: ['name', 'amount', 'unit']
              }
            },
            instructions: {
              type: 'array',
              items: { type: 'string' }
            },
            nutrition: {
              type: 'object',
              properties: {
                calories: { type: 'number' },
                protein: { type: 'number' },
                carbs: { type: 'number' },
                fat: { type: 'number' },
                fiber: { type: 'number' },
                sugar: { type: 'number' }
              },
              required: ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar']
            },
            estimatedCost: { type: 'number', description: 'Estimated ingredient cost in USD' },
            cookTime: { type: 'number', description: 'Cooking time in minutes' },
            prepTime: { type: 'number', description: 'Preparation time in minutes' },
            servings: { type: 'number', description: 'Number of servings' },
            difficulty: { 
              type: 'string', 
              enum: ['easy', 'medium', 'hard'],
              description: 'Recipe difficulty level'
            },
            cuisine: { type: 'string', description: 'Cuisine type' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Recipe tags and categories'
            },
            mealType: {
              type: 'string',
              enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert', 'coffee'],
              description: 'Meal type category for this recipe'
            }
          },
          required: ['id', 'title', 'description', 'ingredients', 'instructions', 'nutrition', 'estimatedCost', 'cookTime', 'prepTime', 'servings', 'difficulty', 'cuisine', 'tags', 'mealType']
        }
      }
    },
    required: ['recipes']
  }
}

interface ProgressiveMealPlanRequest {
  userId: string
  preferences: {
    mealsPerWeek: number
    peoplePerMeal: number
    mealTypes: Array<{ type: string; days: string[] }>
    diets: string[]
    allergies: string[]
    avoidIngredients: string[]
    organicPreference: string
    maxCookTime: number
    cookingSkillLevel: string
    preferredCuisines: string[]
    preferredRetailers: string[]
  }
  pantryItems?: string[]
  phase: 'basic' | 'images'
}

export async function generateProgressiveMealPlan(req: Request, res: Response) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    console.log('Generating progressive meal plan:', req.body)
    
    const { userId, preferences, pantryItems = [], phase = 'basic' }: ProgressiveMealPlanRequest = req.body

    if (!userId || !preferences) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (phase === 'basic') {
      // Phase 1: Generate basic recipes quickly (no images)
      console.log('Phase 1: Generating basic recipes...')
      
      const totalRecipesToGenerate = Math.ceil(preferences.mealsPerWeek * 1.2) // 20% extra for variety
      const prompt = createOptimizedMealPlanPrompt(preferences, pantryItems, totalRecipesToGenerate)
      
      console.log('Calling OpenAI for basic recipe generation...')

      // Optimized OpenAI call with shorter timeout
      const startTime = Date.now()
      const completion = await Promise.race([
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert chef. Generate diverse, delicious recipes quickly. Focus on variety, nutrition balance, and matching user preferences exactly.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          functions: [RECIPE_GENERATION_FUNCTION],
          function_call: { name: 'generate_recipes' },
          temperature: 0.9, // Higher creativity for diversity
          max_tokens: 3500, // Slightly reduced for speed
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI request timeout')), 3500) // Shorter timeout
        )
      ])

      const functionCall = completion.choices[0]?.message?.function_call
      if (!functionCall || functionCall.name !== 'generate_recipes') {
        throw new Error('No function call in OpenAI response')
      }

      const generationTime = Date.now() - startTime
      console.log(`Basic recipes generated in ${generationTime}ms`)

      // Parse the function call response
      let parsedRecipes: { recipes: any[] }
      try {
        parsedRecipes = JSON.parse(functionCall.arguments)
      } catch (parseError) {
        console.error('Failed to parse function call arguments:', parseError)
        throw new Error('Invalid JSON in function call response')
      }

      const recipes = parsedRecipes.recipes || []
      
      if (recipes.length === 0) {
        throw new Error('No recipes generated by OpenAI')
      }

      // Select the best recipes (primary + some backups)
      const primaryRecipes = recipes.slice(0, preferences.mealsPerWeek)
      const backupRecipes = recipes.slice(preferences.mealsPerWeek)

      // Calculate estimated cost
      const subtotalEstimate = calculateEstimatedCost(primaryRecipes, preferences.peoplePerMeal)

      // Create meal plan document
      const mealPlan = {
        userId,
        recipes: primaryRecipes,
        backupRecipes,
        subtotalEstimate,
        ingredientMatchPct: 95,
        status: 'draft',
        preferences,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Save to Firestore
      const docRef = await db.collection('mealPlans').add(mealPlan)
      
      console.log(`Progressive meal plan (basic) saved with ID: ${docRef.id} in ${Date.now() - startTime}ms total`)

      return res.status(200).json({
        success: true,
        planId: docRef.id,
        mealPlan: {
          ...mealPlan,
          id: docRef.id
        }
      })
    }

    return res.status(400).json({ error: 'Invalid phase specified' })

  } catch (error) {
    console.error('Error generating progressive meal plan:', error)
    return res.status(500).json({ 
      error: 'Failed to generate meal plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function createOptimizedMealPlanPrompt(preferences: any, pantryItems: string[], totalRecipesToGenerate: number): string {
  const {
    mealsPerWeek,
    peoplePerMeal,
    mealTypes,
    diets,
    allergies,
    avoidIngredients,
    maxCookTime,
    cookingSkillLevel,
    preferredCuisines
  } = preferences

  // Calculate meal type distribution
  const mealTypeDistribution = mealTypes.map((m: any) => {
    const count = m.days.length
    return `${count} ${m.type} recipes`
  }).join(', ')

  const mealTypesString = mealTypes.map((m: any) => `${m.type} (${m.days.join(', ')})`).join('; ')
  const pantryString = pantryItems.length > 0 ? pantryItems.join(', ') : 'None specified'

  return `Create ${totalRecipesToGenerate} diverse, delicious recipes for meal planning. Primary need: ${mealsPerWeek} meals for ${peoplePerMeal} people.

MEAL TYPE DISTRIBUTION: ${mealTypeDistribution}
Total recipes required: ${totalRecipesToGenerate}

REQUIREMENTS:
- Meal types: ${mealTypesString}
- Dietary restrictions: ${diets.length > 0 ? diets.join(', ') : 'None'}
- Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Avoid: ${avoidIngredients.length > 0 ? avoidIngredients.join(', ') : 'None'}
- Max time: ${maxCookTime} minutes total
- Skill level: ${getFlexibleSkillLevel(cookingSkillLevel)}
- Cuisines: ${preferredCuisines.length > 0 ? preferredCuisines.join(', ') : 'Any'}
- Pantry items: ${pantryString}

OPTIMIZATION:
1. Maximize variety in proteins, cuisines, cooking methods
2. Balance nutrition (400-600 calories per serving)
3. Minimize ingredient complexity for shopping
4. Use pantry items when possible
5. Match skill level and time constraints

Generate exactly ${totalRecipesToGenerate} complete recipes serving ${peoplePerMeal} people each.`
}

function getFlexibleSkillLevel(cookingSkillLevel: string): string {
  switch (cookingSkillLevel.toLowerCase()) {
    case 'beginner':
      return 'beginner to intermediate (include simple to moderate recipes)'
    case 'intermediate':
      return 'beginner to advanced (include simple to complex recipes)'
    case 'advanced':
      return 'intermediate to advanced (include moderate to complex recipes)'
    default:
      return 'any skill level'
  }
}

function calculateEstimatedCost(recipes: any[], servings: number): number {
  if (!recipes || recipes.length === 0) return 0
  
  return recipes.reduce((total: number, recipe: any) => {
    const recipeCost = recipe.estimatedCost || 0
    return total + recipeCost
  }, 0)
}