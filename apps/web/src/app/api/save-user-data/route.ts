import { NextRequest, NextResponse } from 'next/server'
import { createServerAdminClient } from '../../../../lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, preferences, zipCode, mealPlan, consolidatedCart } = body

    if (!email || !preferences) {
      return NextResponse.json({
        error: 'Missing required fields: email, preferences'
      }, { status: 400 })
    }


    const supabase = createServerAdminClient()

    // Check if user exists, create if not
    let user = null
    let isNewUser = false
    
    try {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        console.error('Error listing users:', listError)
        isNewUser = true
      } else {
        const existingUser = users?.find(u => u.email === email)
        if (existingUser) {
          user = existingUser
        } else {
          isNewUser = true
        }
      }
    } catch (error) {
      console.log('Error checking for user, will create new user:', error)
      isNewUser = true
    }

    // Create or update user
    if (isNewUser) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          zipCode,
          preferences,
          completedOnboarding: true,
          createdVia: 'onboarding_completion',
          onboardingCompletedAt: new Date().toISOString()
        }
      })

      if (createError) {
        console.error('Error creating user:', createError)
        throw createError
      }

      user = newUser.user
    } else {
      // Update existing user metadata
      if (!user) {
        throw new Error('User not found but isNewUser is false')
      }
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...user.user_metadata,
            zipCode,
            preferences,
            completedOnboarding: true,
            lastOnboardingUpdate: new Date().toISOString()
          }
        }
      )

      if (updateError) {
        console.error('Error updating user:', updateError)
        throw updateError
      }

      user = updatedUser.user
    }

    // Save to user_profiles table
    if (user) {
      try {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: email,
            zip_code: zipCode,
            preferences: preferences,
            completed_onboarding: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })

        if (profileError) {
          console.error('Error saving user profile to database:', profileError)
        } else {
        }

        // Save meal plan if provided
        if (mealPlan && consolidatedCart) {
          const { error: mealPlanError } = await supabase
            .from('meal_plans')
            .insert({
              user_id: user.id,
              email: email,
              recipes: mealPlan.recipes || [],
              consolidated_cart: consolidatedCart,
              user_preferences: preferences,
              status: 'draft',
              zip_code: zipCode,
              created_at: new Date().toISOString()
            })

          if (mealPlanError) {
            console.error('Error saving meal plan to database:', mealPlanError)
          } else {
          }
        }
      } catch (dbError) {
        console.error('Database save error:', dbError)
        // Continue - don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User data saved successfully',
      userId: user?.id,
      isNewUser
    })

  } catch (error) {
    console.error('Error in save-user-data:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}