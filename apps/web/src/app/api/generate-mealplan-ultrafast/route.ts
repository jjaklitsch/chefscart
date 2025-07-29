import { NextRequest, NextResponse } from 'next/server'
import type { UserPreferences } from '../../../../types'
import { generateMealPlanUltraFast } from '../../../../lib/ultra-fast-generation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { preferences } = await request.json()

    if (!preferences) {
      return NextResponse.json({
        error: 'Preferences are required'
      }, { status: 400 })
    }

    console.log('🚀 Starting ULTRA-FAST meal generation...')
    const startTime = Date.now()

    // Generate meal plan using ultra-fast parallel approach
    const { recipes, generationTime } = await generateMealPlanUltraFast(preferences)

    console.log(`✅ ULTRA-FAST generation complete: ${recipes.length} recipes in ${generationTime}ms`)

    // Build meal plan response
    const mealPlan = {
      id: `plan_${Date.now()}`,
      userId: `temp_${Date.now()}`,
      recipes: recipes,
      subtotalEstimate: recipes.reduce((sum, recipe) => 
        sum + ((recipe.estimatedCost || 8) * (recipe.servings || 2)), 0),
      ingredientMatchPct: 95,
      status: 'draft',
      preferences,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return NextResponse.json({
      success: true,
      planId: mealPlan.id,
      mealPlan,
      generationTime
    })

  } catch (error) {
    console.error('Ultra-fast meal generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate meal plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}