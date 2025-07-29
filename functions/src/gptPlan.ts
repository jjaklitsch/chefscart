import { Request, Response } from 'firebase-functions'
import { getFirestore } from 'firebase-admin/firestore'
import OpenAI from 'openai'
import { generateThumbnailBatch } from './generateThumbnail'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const db = getFirestore()

// Function schema for structured recipe generation
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

interface MealPlanRequest {
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
}

export async function generateMealPlan(req: Request, res: Response) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    console.log('Generating meal plan request:', req.body)
    
    const { userId, preferences, pantryItems = [] }: MealPlanRequest = req.body

    if (!userId || !preferences) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Generate 40% more recipes than needed for backups
    const totalRecipesToGenerate = Math.ceil(preferences.mealsPerWeek * 1.4)
    const prompt = createMealPlanPrompt(preferences, pantryItems, totalRecipesToGenerate)
    
    console.log('Generating meal plan with function calling...')

    // Call OpenAI with function calling for structured output and 4.5s timeout
    const startTime = Date.now()
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert chef and nutritionist. Generate diverse, creative meal plans that perfectly match user preferences. Focus on seasonal ingredients, balanced nutrition, and cost-effective shopping. Always generate exactly the requested number of recipes.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        functions: [RECIPE_GENERATION_FUNCTION],
        function_call: { name: 'generate_recipes' },
        temperature: 0.8, // Higher creativity for more diverse recipes
        max_tokens: 4000,
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI request timeout')), 4500)
      )
    ])

    const functionCall = completion.choices[0]?.message?.function_call
    if (!functionCall || functionCall.name !== 'generate_recipes') {
      throw new Error('No function call in OpenAI response')
    }

    const generationTime = Date.now() - startTime
    console.log(`OpenAI function call completed in ${generationTime}ms`)

    // Parse the function call response
    let parsedRecipes: { recipes: any[] }
    try {
      parsedRecipes = JSON.parse(functionCall.arguments)
    } catch (parseError) {
      console.error('Failed to parse function call arguments:', parseError)
      throw new Error('Invalid JSON in function call response')
    }

    const recipes = parsedRecipes.recipes || []
    
    // Validate that we got recipes
    if (recipes.length === 0) {
      throw new Error('No recipes generated by OpenAI')
    }

    // Generate thumbnails in parallel with recipe processing
    console.log('Generating thumbnails for recipes...')
    const thumbnailStartTime = Date.now()
    
    const thumbnailMap = await generateThumbnailBatch(
      recipes.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        mealType: recipe.mealType || 'dinner' // Default to dinner if not specified
      }))
    )
    
    console.log(`Thumbnails generated in ${Date.now() - thumbnailStartTime}ms`)
    
    // Add thumbnail URLs to recipes
    const recipesWithThumbnails = recipes.map(recipe => ({
      ...recipe,
      imageUrl: thumbnailMap.get(recipe.id) || '/images/placeholder-meal.webp'
    }))

    // Split into primary and backup recipes
    const primaryRecipes = recipesWithThumbnails.slice(0, preferences.mealsPerWeek)
    const backupRecipes = recipesWithThumbnails.slice(preferences.mealsPerWeek)

    // Calculate estimated cost
    const subtotalEstimate = calculateEstimatedCost(primaryRecipes, preferences.peoplePerMeal)

    // Create meal plan document
    const mealPlan = {
      userId,
      recipes: primaryRecipes,
      backupRecipes,
      subtotalEstimate,
      ingredientMatchPct: 95, // Optimistic default
      status: 'draft',
      preferences,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Save to Firestore
    const docRef = await db.collection('mealPlans').add(mealPlan)
    
    console.log('Meal plan saved with ID:', docRef.id)

    return res.status(200).json({
      success: true,
      planId: docRef.id,
      mealPlan: {
        ...mealPlan,
        id: docRef.id
      }
    })

  } catch (error) {
    console.error('Error generating meal plan:', error)
    return res.status(500).json({ 
      error: 'Failed to generate meal plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function createMealPlanPrompt(preferences: any, pantryItems: string[], totalRecipesToGenerate: number): string {
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

  // Calculate meal type distribution including backups (40% extra)
  const mealTypeDistribution = mealTypes.map((m: any) => {
    const baseCount = m.days.length
    const withBackups = Math.ceil(baseCount * 1.4)
    return `${withBackups} ${m.type} recipes (${baseCount} primary + ${withBackups - baseCount} backup)`
  }).join(', ')

  const mealTypesString = mealTypes.map((m: any) => `${m.type} (${m.days.join(', ')})`).join('; ')
  const pantryString = pantryItems.length > 0 ? pantryItems.join(', ') : 'None specified'

  return `Create ${totalRecipesToGenerate} diverse, delicious recipes for meal planning. Primary need: ${mealsPerWeek} meals for ${peoplePerMeal} people.

MEAL TYPE DISTRIBUTION:
Generate exactly: ${mealTypeDistribution}
Total recipes required: ${totalRecipesToGenerate}

STRICT REQUIREMENTS:
- Meal types schedule: ${mealTypesString}
- Dietary restrictions: ${diets.length > 0 ? diets.join(', ') : 'None'}
- Allergies to avoid: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Ingredients to avoid: ${avoidIngredients.length > 0 ? avoidIngredients.join(', ') : 'None'}
- Maximum total time (prep + cook): ${maxCookTime} minutes
- Cooking skill level: ${cookingSkillLevel}
- Preferred cuisines: ${preferredCuisines.length > 0 ? preferredCuisines.join(', ') : 'Any'}
- Available pantry items: ${pantryString}

OPTIMIZATION GOALS:
1. Maximize variety across cuisines, proteins, and cooking methods
2. Balance nutrition across all meals (aim for 400-600 calories per serving)
3. Optimize ingredient overlap to reduce shopping complexity
4. Consider seasonal availability and cost-effectiveness
5. Match difficulty to stated skill level
6. Utilize pantry items when possible to reduce costs

RECIPE REQUIREMENTS:
- Generate exactly ${totalRecipesToGenerate} complete recipes with the meal type distribution specified above
- Each recipe serves ${peoplePerMeal} people
- Include precise ingredient quantities and clear instructions
- Provide accurate nutrition information
- Estimate realistic ingredient costs (USD)
- Use diverse cooking techniques (baking, grilling, stovetop, etc.)
- Ensure recipes can be completed within time constraints

Focus on creating a cohesive meal plan that's exciting, nutritious, and practical for the specified preferences.`
}

function calculateEstimatedCost(recipes: any[], servings: number): number {
  if (!recipes || recipes.length === 0) return 0
  
  return recipes.reduce((total: number, recipe: any) => {
    const recipeCost = recipe.estimatedCost || 0
    return total + recipeCost
  }, 0)
}