import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '../../../../../lib/supabase-server'
import { getSupabaseClient } from '../../../../../lib/supabase'
import { uploadRecipeImages } from '../../../../../lib/supabase-storage'
import { RecipeSubmissionData } from '../../../../../types'

export const dynamic = 'force-dynamic'

// POST /api/social/recipes - Create new user recipe
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authSupabase = createServerAuthClient()
    const { data: { session }, error: sessionError } = await authSupabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const body: RecipeSubmissionData = await request.json()
    const supabase = getSupabaseClient()

    // Get user profile to ensure it exists
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, username')
      .eq('id', session.user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({
        success: false,
        error: 'User profile not found'
      }, { status: 404 })
    }

    // Generate slug from title
    const slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Check for duplicate slug for this user
    const { data: existingRecipe } = await supabase
      .from('user_recipes')
      .select('id')
      .eq('author_id', session.user.id)
      .eq('slug', slug)
      .single()

    if (existingRecipe) {
      return NextResponse.json({
        success: false,
        error: 'You already have a recipe with this title. Please choose a different title.'
      }, { status: 400 })
    }

    // Create recipe record first
    const recipeData = {
      author_id: session.user.id,
      slug,
      title: body.title,
      description: body.description,
      story: body.story || null,
      courses: body.courses,
      cuisines: body.cuisines,
      prep_time: body.prep_time,
      cook_time: body.cook_time,
      total_time: (body.prep_time || 0) + (body.cook_time || 0),
      servings_default: body.servings_default,
      difficulty: body.difficulty,
      spice_level: body.spice_level,
      cost_estimate: body.cost_estimate,
      ingredients_json: {
        servings: body.servings_default,
        ingredients: body.ingredients
      },
      instructions_json: {
        steps: body.instructions,
        time_total_min: (body.prep_time || 0) + (body.cook_time || 0)
      },
      tips_json: body.tips && body.tips.length > 0 ? {
        tips: body.tips
      } : null,
      image_urls: [], // Will be updated after image upload
      status: 'draft' // Start as draft until images are uploaded
    }

    // Auto-generate ingredient tags from ingredients for search
    const ingredientTags = body.ingredients.map(ing => 
      ing.display_name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    ).filter(tag => tag.length > 0)

    // @ts-ignore - Property assignment on recipe data
    recipeData.ingredient_tags = [...new Set(ingredientTags)] // Remove duplicates

    // Auto-detect allergens (basic detection)
    const allergenKeywords = {
      'dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt'],
      'eggs': ['egg', 'eggs'],
      'nuts': ['nuts', 'almond', 'walnut', 'pecan', 'peanut'],
      'gluten': ['flour', 'wheat', 'bread', 'pasta'],
      'soy': ['soy', 'tofu', 'miso'],
      'shellfish': ['shrimp', 'crab', 'lobster', 'scallop'],
      'fish': ['fish', 'salmon', 'tuna', 'cod']
    }

    const detectedAllergens: string[] = []
    Object.entries(allergenKeywords).forEach(([allergen, keywords]) => {
      const hasAllergen = ingredientTags.some(tag =>
        keywords.some(keyword => tag.includes(keyword))
      )
      if (hasAllergen) {
        detectedAllergens.push(allergen)
      }
    })
    // @ts-ignore - Property assignment on recipe data
    recipeData.allergens_present = detectedAllergens

    // Insert recipe
    // @ts-ignore - Supabase types not fully generated for social tables
    const { data: newRecipe, error: insertError } = await supabase
      .from('user_recipes')
      // @ts-ignore - Type compatibility issue with recipe data
      .insert(recipeData)
      .select()
      .single()

    if (insertError) {
      console.error('Recipe insert error:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create recipe'
      }, { status: 500 })
    }

    // Upload images if provided
    let imageUrls: string[] = []
    if (body.image_files && body.image_files.length > 0) {
      // Note: In a real implementation, you'd convert File objects to form data
      // For now, we'll handle image upload separately via a dedicated endpoint
      console.log('Image upload will be handled separately')
    }

    // Update recipe status to published and add image URLs
    // @ts-ignore - Supabase types not fully generated for social tables
    const { data: publishedRecipe, error: updateError } = await supabase
      .from('user_recipes')
      // @ts-ignore - Type compatibility issue with update data
      .update({
        status: 'published',
        image_urls: imageUrls
      })
      // @ts-ignore - Property access on insert result
      .eq('id', newRecipe.id)
      .select()
      .single()

    if (updateError) {
      console.error('Recipe update error:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Recipe created but failed to publish'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      recipe: publishedRecipe,
      message: 'Recipe created successfully!'
    })

  } catch (error) {
    console.error('Recipe creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create recipe'
    }, { status: 500 })
  }
}

// GET /api/social/recipes - Get recipes with filtering/pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '12')
    const offset = parseInt(searchParams.get('offset') || '0')
    const authorId = searchParams.get('author_id')
    const cuisine = searchParams.get('cuisine')
    const course = searchParams.get('course')
    const difficulty = searchParams.get('difficulty')
    const sortBy = searchParams.get('sort') || 'created_at' // created_at, like_count, comment_count

    const supabase = getSupabaseClient()

    // Build query
    let query = supabase
      .from('user_recipes')
      .select(`
        *,
        author:user_profiles(
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('status', 'published')

    // Apply filters
    if (authorId) {
      query = query.eq('author_id', authorId)
    }
    if (cuisine) {
      query = query.contains('cuisines', [cuisine])
    }
    if (course) {
      query = query.contains('courses', [course])
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }

    // Apply sorting
    const validSortFields = ['created_at', 'like_count', 'comment_count', 'view_count']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    query = query.order(sortField, { ascending: false })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: recipes, error } = await query

    if (error) {
      console.error('Recipes fetch error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch recipes'
      }, { status: 500 })
    }

    // Check if there are more recipes
    const { count } = await supabase
      .from('user_recipes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    const hasMore = (offset + limit) < (count || 0)

    return NextResponse.json({
      success: true,
      recipes: recipes || [],
      total_count: count || 0,
      has_more: hasMore
    })

  } catch (error) {
    console.error('Recipes fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch recipes'
    }, { status: 500 })
  }
}