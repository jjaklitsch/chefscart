import { NextRequest, NextResponse } from 'next/server'
import { generateMealPlanWithFunctionCalling } from '../../../../lib/openai-function-calling'
import { Recipe } from '../../../../types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { recipeToReplace, currentRecipes, preferences } = await request.json()

    if (!recipeToReplace || !preferences) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Generate multiple recipes and pick one to ensure uniqueness 
    const result = await generateMealPlanWithFunctionCalling({
      preferences: {
        ...preferences,
        mealsPerWeek: 3, // Generate 3 options to pick the most unique
      },
      timeoutMs: 15000
    })

    if (!result.recipes || result.recipes.length === 0) {
      throw new Error('No replacement recipe generated')
    }

    // Find the most unique recipe compared to current recipes
    const currentTitles = currentRecipes.map((r: any) => r.title.toLowerCase())
    const uniqueRecipe = result.recipes.find(recipe => 
      !currentTitles.some((title: string) => 
        title.includes(recipe.title.toLowerCase().split(' ')[0] || '') ||
        recipe.title.toLowerCase().includes(title.split(' ')[0] || '')
      )
    ) || result.recipes[0] // Fallback to first if none are unique enough
    
    const newRecipe = uniqueRecipe
    
    if (!newRecipe) {
      throw new Error('No replacement recipe could be generated')
    }
    
    // Copy meal type tags from the original recipe
    const mealTypeTags = recipeToReplace.tags?.filter((tag: string) => 
      ['breakfast', 'lunch', 'dinner', 'snack'].includes(tag.toLowerCase())
    ) || []
    
    // Update the new recipe with the same meal type tags
    newRecipe.tags = [
      ...(newRecipe.tags || []).filter((tag: string) => 
        !['breakfast', 'lunch', 'dinner', 'snack'].includes(tag.toLowerCase())
      ),
      ...mealTypeTags
    ]

    // Generate a unique ID for the new recipe
    newRecipe.id = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return NextResponse.json({
      success: true,
      recipe: newRecipe
    })

  } catch (error) {
    console.error('Error generating replacement recipe:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate replacement recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}