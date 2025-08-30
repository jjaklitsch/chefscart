import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../../../lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerAuthClient()
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const planId = params.id
    
    // Get the original meal plan
    const { data: originalPlan, error: fetchError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', session.user.id)
      .single()

    if (fetchError || !originalPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    // Create a new meal plan based on the original
    const newPlanData = {
      user_id: session.user.id,
      email: session.user.email,
      recipes: originalPlan.recipes,
      consolidated_cart: [], // Reset cart - user will need to rebuild
      user_preferences: originalPlan.user_preferences,
      status: 'draft', // Start as draft
      zip_code: originalPlan.zip_code,
      original_plan_id: originalPlan.original_plan_id || originalPlan.id, // Point to the root original
      reorder_count: (originalPlan.reorder_count || 0) + 1
    }

    // Insert the new meal plan
    const { data: newPlan, error: insertError } = await supabase
      .from('meal_plans')
      .insert(newPlanData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating reorder:', insertError)
      return NextResponse.json({ error: 'Failed to create reorder' }, { status: 500 })
    }

    // Update the original plan's last_reordered_at timestamp
    const { error: updateError } = await supabase
      .from('meal_plans')
      .update({ 
        last_reordered_at: new Date().toISOString(),
        reorder_count: (originalPlan.reorder_count || 0) + 1
      })
      .eq('id', originalPlan.original_plan_id || originalPlan.id)

    if (updateError) {
      console.warn('Error updating original plan reorder timestamp:', updateError)
      // Don't fail the request for this
    }

    // Transform the new plan to match the expected format
    const transformedPlan = {
      id: newPlan.id,
      userId: newPlan.user_id,
      recipes: newPlan.recipes || [],
      backupRecipes: [],
      subtotalEstimate: 0,
      ingredientMatchPct: 0,
      status: newPlan.status,
      createdAt: new Date(newPlan.created_at),
      updatedAt: new Date(newPlan.updated_at || newPlan.created_at),
      originalPlanId: newPlan.original_plan_id,
      reorderCount: newPlan.reorder_count
    }

    return NextResponse.json({
      success: true,
      mealPlan: transformedPlan,
      message: 'Meal plan reordered successfully'
    })

  } catch (error) {
    console.error('Reorder meal plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}