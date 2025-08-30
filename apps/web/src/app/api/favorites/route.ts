import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerAuthClient()
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's favorite meals
    const { data: favorites, error: favoritesError } = await supabase
      .from('user_favorite_meals')
      .select(`
        id,
        meal_id,
        created_at,
        meals (
          id,
          title,
          description,
          prep_time,
          cook_time,
          time_total_min,
          cooking_difficulty,
          cuisines,
          image,
          allergens_present,
          diets_supported,
          ingredients_json
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (favoritesError) {
      console.error('Error fetching favorites:', favoritesError)
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
    }

    // Transform data to match Recipe interface
    const transformedFavorites = favorites?.map((fav: any) => ({
      id: fav.meals.id.toString(),
      title: fav.meals.title,
      description: fav.meals.description,
      prepTime: fav.meals.prep_time || 0,
      cookTime: fav.meals.cook_time || 0,
      servings: 4, // Default servings
      difficulty: fav.meals.cooking_difficulty || 'medium',
      cuisine: Array.isArray(fav.meals.cuisines) ? fav.meals.cuisines[0] : fav.meals.cuisines || '',
      tags: Array.isArray(fav.meals.cuisines) ? fav.meals.cuisines : [fav.meals.cuisines || ''],
      imageUrl: fav.meals.image,
      ingredients: fav.meals.ingredients_json || [],
      instructions: [], // Not stored in meals table
      nutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0
      },
      estimatedCost: 0,
      mealType: 'dinner',
      favoriteId: fav.id,
      favoritedAt: fav.created_at
    })) || []

    return NextResponse.json({
      success: true,
      favorites: transformedFavorites,
      count: transformedFavorites.length
    })

  } catch (error) {
    console.error('Favorites API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerAuthClient()
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { meal_id } = await request.json()
    
    if (!meal_id) {
      return NextResponse.json({ error: 'meal_id is required' }, { status: 400 })
    }

    // Add to favorites (will fail if already exists due to unique constraint)
    const { data, error } = await supabase
      .from('user_favorite_meals')
      .insert({
        user_id: session.user.id,
        meal_id: parseInt(meal_id)
      })
      .select()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Meal already in favorites' }, { status: 409 })
      }
      console.error('Error adding favorite:', error)
      return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      favorite: data?.[0],
      message: 'Meal added to favorites'
    })

  } catch (error) {
    console.error('Add favorite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerAuthClient()
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { meal_id } = await request.json()
    
    if (!meal_id) {
      return NextResponse.json({ error: 'meal_id is required' }, { status: 400 })
    }

    // Remove from favorites
    const { error } = await supabase
      .from('user_favorite_meals')
      .delete()
      .eq('user_id', session.user.id)
      .eq('meal_id', parseInt(meal_id))

    if (error) {
      console.error('Error removing favorite:', error)
      return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Meal removed from favorites'
    })

  } catch (error) {
    console.error('Remove favorite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}