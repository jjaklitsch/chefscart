import OpenAI from 'openai'
import { UserPreferences, Recipe } from '../types'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10000, // Even shorter timeout for micro-calls
    })
  }
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  return openai
}

// Micro-focused function schemas for maximum speed
const BASIC_RECIPE_FUNCTION = {
  name: 'generate_basic_recipe',
  description: 'Generate basic recipe info only',
  parameters: {
    type: 'object',
    properties: {
      recipe: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          mealType: { type: 'string' },
          cuisine: { type: 'string' },
          difficulty: { type: 'string' },
          cookTime: { type: 'number' },
          prepTime: { type: 'number' },
          servings: { type: 'number' },
          estimatedCost: { type: 'number', description: 'Cost per serving in USD (estimate $6-12 per serving)' }
        },
        required: ['id', 'title', 'description', 'mealType']
      }
    },
    required: ['recipe']
  }
}

const INGREDIENTS_FUNCTION = {
  name: 'generate_ingredients',
  description: 'Generate detailed ingredients list',
  parameters: {
    type: 'object',
    properties: {
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            amount: { type: 'number' },
            unit: { type: 'string' },
            category: { type: 'string' },
            preparation: { type: 'string' }
          },
          required: ['name', 'amount', 'unit']
        }
      }
    },
    required: ['ingredients']
  }
}

const INSTRUCTIONS_FUNCTION = {
  name: 'generate_instructions',
  description: 'Generate cooking instructions',
  parameters: {
    type: 'object',
    properties: {
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
        }
      }
    },
    required: ['instructions']
  }
}

interface MealRequest {
  mealType: string
  day: string
  servings: number
  adults: number
  kids: number
  index: number
}

// Generate basic recipe info only (fast!)
async function generateBasicRecipe(
  request: MealRequest,
  preferences: UserPreferences,
  existingTitles: string[] = []
): Promise<Partial<Recipe>> {
  const avoidDuplicates = existingTitles.length > 0 
    ? `\n\nIMPORTANT: Do NOT create any of these existing recipes: ${existingTitles.join(', ')}`
    : ''
    
  const prompt = `Create a UNIQUE ${request.mealType} recipe for ${request.day}.
  
REQUIREMENTS:
- Serves ${request.adults} adults, ${request.kids} kids (${request.servings} total servings)
- Cooking skill: ${preferences.cookingSkillLevel}
- Max cook time: ${preferences.maxCookTime} minutes
- Cuisines: ${preferences.preferredCuisines?.join(', ') || 'Any'}
- Avoid: ${preferences.allergies?.join(', ') || 'None'}
- Must be completely different from other meals${avoidDuplicates}

CRITICAL: Recipe must be COMPLETELY UNIQUE. Avoid:
- Similar proteins (if previous used chicken, use beef/fish/pork/vegetarian)
- Similar cooking methods (if previous was grilled, use baked/sautéed/braised)
- Similar cuisine styles (if previous was Italian, use Asian/Mexican/Mediterranean)
- Similar ingredient bases (if previous used pasta, use rice/potatoes/bread)

Generate ONLY the basic recipe info - name, description, timing, difficulty, estimated cost per serving ($6-12 range). No ingredients or instructions yet.
Make this recipe unique and creative (Seed: ${Math.random().toString(36).substr(2, 9)}).`

  try {
    const completion = await Promise.race([
      getOpenAIClient().chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate basic recipe info only - title, description, timing. Keep it concise and focused.'
          },
          { role: 'user', content: prompt }
        ],
        functions: [BASIC_RECIPE_FUNCTION],
        function_call: { name: 'generate_basic_recipe' },
        temperature: 0.8,
        max_tokens: 500, // Very small for basic info
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Basic recipe timeout')), 8000)
      )
    ])

    const functionCall = completion.choices[0]?.message?.function_call
    if (functionCall?.name === 'generate_basic_recipe') {
      const result = JSON.parse(functionCall.arguments || '{}')
      return { ...result.recipe, servings: request.servings }
    }
    throw new Error('No basic recipe generated')
  } catch (error) {
    console.error(`Failed to generate basic recipe for ${request.mealType}:`, error)
    throw error
  }
}

// Generate ingredients only (focused!)
async function generateIngredients(
  basicRecipe: Partial<Recipe>,
  request: MealRequest,
  preferences: UserPreferences
): Promise<any[]> {
  const prompt = `Generate ingredients for "${basicRecipe.title}" - a ${basicRecipe.description}.

RECIPE DETAILS:
- ${request.mealType} for ${request.servings} servings (${request.adults} adults + ${request.kids} kids)
- Cooking skill: ${preferences.cookingSkillLevel}
- Style: ${basicRecipe.cuisine}
- Cook time: ${basicRecipe.cookTime} minutes

CRITICAL: Scale ALL ingredient amounts for exactly ${request.servings} servings. 
Include precise measurements (cups, tablespoons, ounces, pounds, etc.) and preparation instructions.
Consider that adults need larger portions than kids.`

  try {
    const completion = await Promise.race([
      getOpenAIClient().chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate detailed ingredients list with precise measurements and preparation instructions.'
          },
          { role: 'user', content: prompt }
        ],
        functions: [INGREDIENTS_FUNCTION],
        function_call: { name: 'generate_ingredients' },
        temperature: 0.6,
        max_tokens: 1000,
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Ingredients timeout')), 8000)
      )
    ])

    const functionCall = completion.choices[0]?.message?.function_call
    if (functionCall?.name === 'generate_ingredients') {
      const result = JSON.parse(functionCall.arguments || '{}')
      return result.ingredients || []
    }
    throw new Error('No ingredients generated')
  } catch (error) {
    console.error(`Failed to generate ingredients for ${basicRecipe.title}:`, error)
    return [] // Return empty array instead of failing entirely
  }
}

// Generate cooking instructions only (detailed!)
async function generateInstructions(
  basicRecipe: Partial<Recipe>,
  ingredients: any[],
  request: MealRequest
): Promise<{ instructions: string[], nutrition?: any }> {
  const ingredientsList = ingredients.map(ing => 
    `${ing.amount} ${ing.unit} ${ing.name} (${ing.preparation || 'as needed'})`
  ).join(', ')

  const prompt = `Generate cooking instructions for "${basicRecipe.title}".

RECIPE: ${basicRecipe.description}
INGREDIENTS: ${ingredientsList}
COOK TIME: ${basicRecipe.cookTime} minutes
DIFFICULTY: ${basicRecipe.difficulty}

Create step-by-step cooking instructions with timing, temperatures, and visual cues. Also estimate nutrition.`

  try {
    const completion = await Promise.race([
      getOpenAIClient().chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system', 
            content: 'Generate detailed cooking instructions with timing, temperatures, and nutritional estimates.'
          },
          { role: 'user', content: prompt }
        ],
        functions: [INSTRUCTIONS_FUNCTION],
        function_call: { name: 'generate_instructions' },
        temperature: 0.7,
        max_tokens: 1500,
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Instructions timeout')), 10000)
      )
    ])

    const functionCall = completion.choices[0]?.message?.function_call
    if (functionCall?.name === 'generate_instructions') {
      const result = JSON.parse(functionCall.arguments || '{}')
      return {
        instructions: result.instructions || [],
        nutrition: result.nutrition
      }
    }
    throw new Error('No instructions generated')
  } catch (error) {
    console.error(`Failed to generate instructions for ${basicRecipe.title}:`, error)
    return { instructions: ['Instructions not available'] }
  }
}

// Progressive meal plan generation with live updates
export async function generateMealPlanProgressive(
  preferences: UserPreferences,
  onProgress?: (update: { stage: string, completed: number, total: number, recipes: Recipe[] }) => void
): Promise<{ recipes: Recipe[], generationTime: number }> {
  const startTime = Date.now()
  
  // Create exact meal requests (no artificial limits!)
  const requests: MealRequest[] = []
  let index = 0
  
  preferences.mealTypes?.forEach(mealType => {
    mealType.days.forEach(day => {
      requests.push({
        mealType: mealType.type,
        day,
        servings: (mealType.adults || 2) + (mealType.kids || 0),
        adults: mealType.adults || 2,
        kids: mealType.kids || 0,
        index: index++
      })
    })
  })

  console.log(`🚀 Starting ultra-parallel generation: ${requests.length} meals`)
  onProgress?.({ stage: 'Starting', completed: 0, total: requests.length, recipes: [] })

  const finalRecipes: Recipe[] = []

  try {
    // STAGE 1: Generate basic recipes sequentially to avoid duplicates (fast!)
    console.log('📝 Stage 1: Basic recipes...')
    const existingTitles: string[] = []
    const basicRecipes: { result: Partial<Recipe>, request: MealRequest }[] = []
    
    // Generate recipes sequentially to prevent duplicates
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i]
      try {
        const result = await generateBasicRecipe(request, preferences, existingTitles)
        if (result?.title) {
          existingTitles.push(result.title)
          basicRecipes.push({ result, request })
        }
      } catch (error) {
        console.warn(`Basic recipe failed for ${request.mealType}:`, error.message)
      }
    }

    onProgress?.({ 
      stage: 'Basic recipes completed', 
      completed: basicRecipes.length, 
      total: requests.length, 
      recipes: basicRecipes.map(item => item.result as Recipe)
    })

    console.log(`✅ Stage 1 complete: ${basicRecipes.length}/${requests.length} basic recipes`)

    // STAGE 2: Generate ALL ingredients in parallel
    console.log('🥕 Stage 2: Ingredients...')
    const ingredientPromises = basicRecipes.map(({ result, request }) =>
      generateIngredients(result!, request, preferences)
    )

    const ingredientResults = await Promise.allSettled(ingredientPromises)
    
    // STAGE 3: Generate ALL instructions in parallel  
    console.log('👨‍🍳 Stage 3: Instructions...')
    const instructionPromises = basicRecipes.map(({ result }, index) => {
      const ingredients = ingredientResults[index].status === 'fulfilled' 
        ? ingredientResults[index].value 
        : []
      return generateInstructions(result!, ingredients, basicRecipes[index].request)
    })

    const instructionResults = await Promise.allSettled(instructionPromises)

    // STAGE 4: Combine everything
    console.log('🔧 Stage 4: Assembly...')
    basicRecipes.forEach(({ result, request }, index) => {
      const ingredients = ingredientResults[index].status === 'fulfilled' 
        ? ingredientResults[index].value 
        : []
      const instructionData = instructionResults[index].status === 'fulfilled'
        ? instructionResults[index].value
        : { instructions: ['Instructions not available'] }

      const completeRecipe: Recipe = {
        ...result!,
        ingredients,
        instructions: instructionData.instructions,
        nutrition: instructionData.nutrition || {
          calories: 400, protein: 25, carbs: 35, fat: 15, fiber: 5, sugar: 8
        },
        tags: [result!.cuisine || 'general', result!.difficulty || 'medium'],
        servings: request.servings
      }

      finalRecipes.push(completeRecipe)
    })

    const generationTime = Date.now() - startTime
    console.log(`🎉 Ultra-parallel generation complete: ${finalRecipes.length} recipes in ${generationTime}ms`)

    onProgress?.({ 
      stage: 'Complete', 
      completed: finalRecipes.length, 
      total: requests.length, 
      recipes: finalRecipes 
    })

    return { recipes: finalRecipes, generationTime }

  } catch (error) {
    console.error('Ultra-parallel generation failed:', error)
    throw error
  }
}