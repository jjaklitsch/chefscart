import { NextRequest, NextResponse } from 'next/server'
import type { Recipe, UserPreferences } from '../../../../types'
import { generateReplacementRecipeHTTP } from '../../../../lib/pure-http-generation'

export const dynamic = 'force-dynamic'

// Replacement recipe generation function schema
const REPLACEMENT_RECIPE_FUNCTION = {
  name: 'generate_replacement_recipe',
  description: 'Generate a single replacement recipe',
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
          servings: { type: 'number' },
          estimatedCost: { type: 'number' },
          cookTime: { type: 'number' },
          prepTime: { type: 'number' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          cuisine: { type: 'string' },
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
            }
          }
        },
        required: ['id', 'title', 'description', 'mealType', 'servings', 'estimatedCost', 'ingredients', 'instructions']
      }
    },
    required: ['recipe']
  }
}

export async function POST(request: NextRequest) {
  try {
    const { recipeToReplace, currentRecipes, preferences, dismissedRecipes = [] } = await request.json()

    if (!recipeToReplace || !preferences) {
      return NextResponse.json({
        error: 'Missing required fields: recipeToReplace and preferences are required'
      }, { status: 400 })
    }

    console.log(`Generating replacement for: ${recipeToReplace.title}`)

    // Get all recipes to avoid (current + dismissed)
    const existingTitles = (currentRecipes || []).map((r: Recipe) => r.title)
    const allAvoidTitles = [...existingTitles, ...dismissedRecipes]
    
    console.log(`Avoiding ${allAvoidTitles.length} existing/dismissed recipes`)

    // Create replacement prompt
    const prompt = createReplacementPrompt(recipeToReplace, preferences, allAvoidTitles)

    // Generate replacement recipe using pure HTTP with retry logic
    console.log(`Generating replacement recipe using pure HTTP for: ${recipeToReplace.title}`)
    const parsedResponse = await generateReplacementRecipeHTTP(
      prompt,
      REPLACEMENT_RECIPE_FUNCTION,
      'generate_replacement_recipe'
    )

    const newRecipe = parsedResponse.recipe
    if (!newRecipe) {
      throw new Error('No recipe generated')
    }

    console.log(`Generated replacement: ${newRecipe.title}`)

    return NextResponse.json({
      success: true,
      recipe: {
        ...newRecipe,
        tags: [newRecipe.mealType, newRecipe.cuisine],
        imageUrl: null,
        imageLoading: true,
        imageError: false
      }
    })

  } catch (error) {
    console.error('Error generating replacement recipe:', error)
    return NextResponse.json({
      error: 'Failed to generate replacement recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function createReplacementPrompt(recipeToReplace: Recipe, preferences: UserPreferences, avoidTitles: string[]): string {
  const skillLevel = getFlexibleSkillLevel(preferences.cookingSkillLevel)
  
  return `Generate 1 replacement recipe for "${recipeToReplace.title}" (${recipeToReplace.mealType}).

REPLACEMENT REQUIREMENTS:
- Must be completely different from the original recipe
- Same meal type: ${recipeToReplace.mealType}
- Same servings: ${recipeToReplace.servings}
- Max cooking time: ${preferences.maxCookTime || 30} minutes total
- Skill level: ${skillLevel}
- Dietary restrictions: ${preferences.diets?.join(', ') || 'None'}
- Allergies: ${preferences.allergies?.join(', ') || 'None'}
- Preferred cuisines: ${preferences.preferredCuisines?.join(', ') || 'Any'}

AVOID THESE RECIPES (already exist or dismissed):
${avoidTitles.map(title => `- ${title}`).join('\n')}

GOALS:
- Create a unique, detailed recipe with specific ingredients and amounts
- Include complete step-by-step cooking instructions
- Ensure balanced nutrition (400-600 calories per serving)
- Cost-effective ingredients ($6-12 per serving)
- Different protein, cuisine style, or cooking method than original

Generate exactly 1 complete replacement recipe with detailed ingredients and instructions.`
}

function getFlexibleSkillLevel(cookingSkillLevel: string): string {
  switch (cookingSkillLevel?.toLowerCase()) {
    case 'beginner':
      return 'beginner to intermediate (simple to moderate recipes)'
    case 'intermediate':
      return 'beginner to advanced (simple to complex recipes)'
    case 'advanced':
      return 'intermediate to advanced (moderate to complex recipes)'
    default:
      return 'any skill level'
  }
}