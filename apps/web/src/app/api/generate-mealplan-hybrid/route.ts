import { NextRequest, NextResponse } from 'next/server'
import type { UserPreferences } from '../../../../types'
import { generateMealPlanHybrid } from '../../../../lib/hybrid-fast-generation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { preferences } = await request.json()

    if (!preferences) {
      return NextResponse.json({
        error: 'Preferences are required'
      }, { status: 400 })
    }

    console.log('🚀 Starting HYBRID meal generation (1 blocking + parallel details)...')

    // Generate meal plan using hybrid approach
    const { recipes, generationTime } = await generateMealPlanHybrid(preferences)

    console.log(`✅ HYBRID generation complete: ${recipes.length} recipes in ${generationTime}ms`)

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
    console.error('Hybrid meal generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate meal plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}