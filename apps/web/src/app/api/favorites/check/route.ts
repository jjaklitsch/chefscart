import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../../lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerAuthClient()
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { meal_ids } = await request.json()
    
    if (!Array.isArray(meal_ids)) {
      return NextResponse.json({ error: 'meal_ids must be an array' }, { status: 400 })
    }

    // Check which meals are favorited
    const { data: favorites, error } = await supabase
      .from('user_favorite_meals')
      .select('meal_id')
      .eq('user_id', session.user.id)
      .in('meal_id', meal_ids.map(id => parseInt(id)))

    if (error) {
      console.error('Error checking favorites:', error)
      return NextResponse.json({ error: 'Failed to check favorites' }, { status: 500 })
    }

    const favoritedMealIds = favorites?.map(f => f.meal_id.toString()) || []
    
    return NextResponse.json({
      success: true,
      favorites: meal_ids.reduce((acc, mealId) => {
        acc[mealId] = favoritedMealIds.includes(mealId.toString())
        return acc
      }, {} as Record<string, boolean>)
    })

  } catch (error) {
    console.error('Check favorites error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}