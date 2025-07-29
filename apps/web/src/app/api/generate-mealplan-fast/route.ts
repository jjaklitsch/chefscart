import { NextRequest, NextResponse } from 'next/server'
import type { UserPreferences } from '../../../../types'
import { generateMealPlanPureHTTP } from '../../../../lib/pure-http-generation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { preferences } = await request.json()

    if (!preferences) {
      return NextResponse.json({
        error: 'Preferences are required'
      }, { status: 400 })
    }

    console.log('⚡ Starting PURE HTTP meal generation (TRUE PARALLEL!)...')
    console.log(`📊 Request: ${JSON.stringify({mealTypes: preferences.mealTypes?.map((mt: any) => ({type: mt.type, days: mt.days.length}))})}`)
    
    const overallStart = Date.now()

    // Generate meal plan using pure HTTP (no SDK queueing)
    const { recipes, generationTime } = await generateMealPlanPureHTTP(preferences)

    const overallTime = Date.now() - overallStart
    console.log(`✅ PURE HTTP generation complete: ${recipes.length} recipes`)
    console.log(`⏱️  Timing breakdown - Library: ${generationTime}ms, Overall: ${overallTime}ms`)
    
    // Log if true parallel execution worked
    if (recipes.length > 3 && generationTime < recipes.length * 1500) {
      console.log(`🎉 SUCCESS: TRUE PARALLEL EXECUTION! ${Math.round(generationTime / recipes.length)}ms per recipe`)
    } else {
      console.log(`⚠️  Still appears sequential: ${Math.round(generationTime / recipes.length)}ms per recipe`)
    }

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
      generationTime: overallTime
    })

  } catch (error) {
    console.error('❌ Pure HTTP meal generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate meal plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}