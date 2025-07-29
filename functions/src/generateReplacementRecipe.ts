import { Request, Response } from 'firebase-functions'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Optimized single recipe function schema
const SINGLE_RECIPE_FUNCTION = {
  name: 'generate_single_recipe',
  description: 'Generate a single recipe replacement',
  parameters: {
    type: 'object',
    properties: {
      recipe: {
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
    },
    required: ['recipe']
  }
}

interface ReplacementRequest {
  recipeToReplace: {
    id: string
    title: string
    mealType: string
    servings: number
    description?: string
  }
  preferences: {
    diets: string[]
    allergies: string[]
    avoidIngredients: string[]
    maxCookTime: number
    cookingSkillLevel: string
    preferredCuisines: string[]
  }
  avoidTitles: string[]
  mealType: string
  servings: number
}

export async function generateReplacementRecipe(req: Request, res: Response) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    console.log('Generating replacement recipe:', req.body)
    
    const { recipeToReplace, preferences, avoidTitles, mealType, servings }: ReplacementRequest = req.body

    if (!recipeToReplace || !preferences) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const prompt = createReplacementPrompt(recipeToReplace, preferences, avoidTitles, mealType, servings)
    
    console.log(`Generating replacement for "${recipeToReplace.title}" (avoiding ${avoidTitles.length} recipes)`)

    // Fast OpenAI call with aggressive timeout
    const startTime = Date.now()
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert chef generating recipe replacements. Create something completely different from what's being replaced while meeting all requirements. Be creative and unique.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        functions: [SINGLE_RECIPE_FUNCTION],
        function_call: { name: 'generate_single_recipe' },
        temperature: 1.0, // Maximum creativity for uniqueness
        max_tokens: 2000, // Optimized for single recipe
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Replacement generation timeout')), 2500) // Very short timeout
      )
    ])

    const functionCall = completion.choices[0]?.message?.function_call
    if (!functionCall || functionCall.name !== 'generate_single_recipe') {
      throw new Error('No function call in OpenAI response')
    }

    const generationTime = Date.now() - startTime
    console.log(`Replacement recipe generated in ${generationTime}ms`)

    // Parse the function call response
    let parsedRecipe: { recipe: any }
    try {
      parsedRecipe = JSON.parse(functionCall.arguments)
    } catch (parseError) {
      console.error('Failed to parse function call arguments:', parseError)
      throw new Error('Invalid JSON in function call response')
    }

    const recipe = parsedRecipe.recipe
    
    if (!recipe) {
      throw new Error('No recipe generated by OpenAI')
    }

    // Ensure proper ID and metadata
    const replacementRecipe = {
      ...recipe,
      id: `replacement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      mealType: mealType,
      servings: servings,
      createdAt: new Date(),
      isReplacement: true
    }

    console.log(`Generated replacement: "${replacementRecipe.title}" in ${generationTime}ms`)

    return res.status(200).json({
      success: true,
      recipe: replacementRecipe,
      generationTime
    })

  } catch (error) {
    console.error('Error generating replacement recipe:', error)
    return res.status(500).json({ 
      error: 'Failed to generate replacement recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function createReplacementPrompt(
  recipeToReplace: any, 
  preferences: any, 
  avoidTitles: string[], 
  mealType: string, 
  servings: number
): string {
  const {
    diets,
    allergies,
    avoidIngredients,
    maxCookTime,
    cookingSkillLevel,
    preferredCuisines
  } = preferences

  const avoidSection = avoidTitles.length > 0 
    ? `\n\nCRITICAL - DO NOT CREATE:\n${avoidTitles.map(title => `- ${title}`).join('\n')}\nThe replacement must be COMPLETELY DIFFERENT from these existing/dismissed recipes.`
    : ''

  return `Generate a ${mealType} recipe replacement for "${recipeToReplace.title}".

REQUIREMENTS:
- Meal type: ${mealType}
- Servings: ${servings}
- Dietary restrictions: ${diets.length > 0 ? diets.join(', ') : 'None'}
- Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Avoid ingredients: ${avoidIngredients.length > 0 ? avoidIngredients.join(', ') : 'None'}
- Max time: ${maxCookTime} minutes total
- Skill level: ${getFlexibleSkillLevel(cookingSkillLevel)}
- Preferred cuisines: ${preferredCuisines.length > 0 ? preferredCuisines.join(', ') : 'Any'}

REPLACEMENT STRATEGY:
- Use DIFFERENT protein than "${recipeToReplace.title}" 
- Use DIFFERENT cooking method (if grilled, try baked/sautéed/braised)
- Use DIFFERENT cuisine style when possible
- Create something the user will be excited to try${avoidSection}

Make this replacement unique, delicious, and perfectly suited to the user's preferences.`
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