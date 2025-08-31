import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerAdminClient } from '../../../../lib/supabase-server'
import { getEmailHtml, MealPlanEmailData } from '../../../../lib/email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, cartUrl, mealPlan, consolidatedCart, userPreferences } = body

    if (!email || !cartUrl || !mealPlan || !consolidatedCart) {
      return NextResponse.json({
        error: 'Missing required fields: email, cartUrl, mealPlan, consolidatedCart'
      }, { status: 400 })
    }


    const supabase = createServerAdminClient()

    // Check if user exists in our auth system
    let user = null
    let isNewUser = false
    
    try {
      // List users to find by email (since getUserByEmail doesn't exist in this version)
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
      console.log('Error checking for user, treating as new user:', error)
      isNewUser = true
    }

    // If user doesn't exist, create a new account
    if (isNewUser) {
      const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true, // Auto-confirm email since we're creating via admin
        user_metadata: {
          zipCode: userPreferences?.zipCode,
          preferences: userPreferences,
          createdVia: 'meal_plan_email',
          completedOnboarding: true
        }
      })

      if (signUpError) {
        console.error('Error creating user account:', signUpError)
        // Continue anyway - we can still send the email
      } else {
        user = newUser.user
      }
    }

    // Helper function to generate slug from title
    const generateSlug = (title: string): string => {
      return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    // Helper function to generate username from email
    const generateUsername = (email: string): string => {
      const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
      const randomSuffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
      return `${baseUsername}${randomSuffix}`
    }

    // Helper function to extract display name from email
    const generateDisplayName = (email: string): string => {
      const username = email.split('@')[0]
      // Capitalize first letter and replace dots/underscores with spaces
      return username
        .split(/[._-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    }

    // Prepare email data
    const emailData: MealPlanEmailData = {
      userEmail: email,
      cartUrl,
      meals: mealPlan.recipes.map((recipe: any) => ({
        id: recipe.id,
        slug: recipe.slug || generateSlug(recipe.title || 'recipe'),
        title: recipe.title,
        description: recipe.description,
        cuisine: recipe.cuisine,
        mealType: recipe.mealType,
        cookTime: recipe.cookTime,
        prepTime: recipe.prepTime,
        servings: recipe.servings,
        ingredients: recipe.ingredients
      })),
      totalServings: mealPlan.recipes.reduce((total: number, recipe: any) => total + (recipe.servings || 0), 0),
      consolidatedCart: consolidatedCart.map((item: any) => ({
        name: item.name,
        shoppableName: item.shoppableName,
        shoppingQuantity: item.shoppingQuantity,
        shoppingUnit: item.shoppingUnit,
        category: item.category,
        usedIn: item.usedIn || []
      }))
    }

    // Send the email
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: `ChefsCart <${process.env.RESEND_FROM_EMAIL || 'support@chefscart.ai'}>`,
      to: [email],
      subject: `🍳 Your ChefsCart Meal Plan is Ready! (${mealPlan.recipes.length} recipes)`,
      html: getEmailHtml(emailData),
    })

    if (emailError) {
      console.error('Error sending email:', emailError)
      return NextResponse.json({
        error: 'Failed to send email',
        details: emailError
      }, { status: 500 })
    }


    // Save meal plan to database if we have a user
    if (user) {
      try {
        // First, ensure user profile exists with social fields
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: email,
            username: generateUsername(email),
            display_name: generateDisplayName(email),
            bio: null,
            avatar_url: null,
            cover_image_url: null,
            location: userPreferences?.zipCode ? `ZIP ${userPreferences.zipCode}` : null,
            website_url: null,
            zip_code: userPreferences?.zipCode,
            preferences: userPreferences,
            completed_onboarding: true,
            is_public: true,
            is_verified: false,
            follower_count: 0,
            following_count: 0,
            recipe_count: 0,
            total_likes_received: 0,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })

        if (profileError) {
          console.error('Error saving user profile:', profileError)
        } else {
        }

        // Save meal plan
        const { error: mealPlanError } = await supabase
          .from('meal_plans')
          .insert({
            user_id: user.id,
            email: email,
            recipes: mealPlan.recipes,
            consolidated_cart: consolidatedCart,
            user_preferences: userPreferences,
            cart_url: cartUrl,
            status: 'cart_created',
            zip_code: userPreferences?.zipCode,
            created_at: new Date().toISOString()
          })

        if (mealPlanError) {
          console.error('Error saving meal plan to database:', mealPlanError)
        } else {
        }
      } catch (error) {
        console.error('Error saving to database:', error)
        // Don't fail the request if we can't save to DB
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      isNewUser,
      emailId: emailResult?.id
    })

  } catch (error) {
    console.error('Error in send-meal-plan-email:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}