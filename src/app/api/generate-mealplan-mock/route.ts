import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  let userId: string | undefined
  let preferences: any
  let zipCode: string | undefined
  
  try {
    console.log('API endpoint hit - parsing request...')
    const body = await request.json()
    userId = body.userId
    preferences = body.preferences
    zipCode = body.zipCode

    console.log('Request body:', { userId, preferences: !!preferences, zipCode })

    if (!userId || !preferences) {
      console.log('Missing required fields')
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.log('Missing OpenAI API key')
      return NextResponse.json({
        error: 'OpenAI API key not configured'
      }, { status: 500 })
    }

    console.log('Generating meal plan with OpenAI directly...')

    // Create GPT prompt based on preferences
    const prompt = createMealPlanPrompt(preferences)
    
    // Call OpenAI to generate meal plan with timeout
    console.log('Making OpenAI API call...')
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert chef and nutritionist. Generate meal plans in valid JSON format only. No additional text or explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI request timeout')), 25000)
      )
    ]) as any

    const mealPlanData = completion.choices[0]?.message?.content
    if (!mealPlanData) {
      throw new Error('No response from OpenAI')
    }

    console.log('GPT Response received')

    // Parse the JSON response
    let parsedPlan
    try {
      parsedPlan = JSON.parse(mealPlanData)
    } catch (parseError) {
      console.error('Failed to parse GPT response:', parseError)
      throw new Error('Invalid JSON response from AI')
    }

    // Add 30-40% more recipes as backups
    const targetRecipes = preferences.mealsPerWeek
    const backupCount = Math.ceil(targetRecipes * 0.35)
    
    const recipes = parsedPlan.recipes || []
    const primaryRecipes = recipes.slice(0, targetRecipes)
    const backupRecipes = recipes.slice(targetRecipes, targetRecipes + backupCount)

    // Calculate estimated cost
    const subtotalEstimate = primaryRecipes.reduce((sum: number, recipe: any) => 
      sum + (recipe.estimatedCost || 0), 0)

    // Create meal plan document
    const mealPlan = {
      id: `plan_${Date.now()}`,
      userId,
      recipes: primaryRecipes,
      backupRecipes,
      subtotalEstimate,
      ingredientMatchPct: 95,
      status: 'draft',
      preferences,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    console.log('Meal plan generated successfully')

    return NextResponse.json({
      success: true,
      planId: mealPlan.id,
      mealPlan
    })

  } catch (error) {
    console.error('Error generating meal plan:', error)
    
    // If it's a timeout or OpenAI error, return a fallback response
    if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('OpenAI')) && userId && preferences) {
      console.log('Returning fallback meal plan due to OpenAI error')
      return getFallbackMealPlan(userId, preferences)
    }
    
    return NextResponse.json({
      error: 'Failed to generate meal plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Fallback meal plan if OpenAI fails
function getFallbackMealPlan(userId: string, preferences: any) {
  try {
    const fallbackRecipes = [
      {
        id: 'recipe-1',
        title: 'Simple Chicken Stir Fry',
        description: 'Quick and healthy chicken stir fry with vegetables',
        ingredients: [
          { name: 'chicken breast', amount: 1, unit: 'lb', category: 'meat' },
          { name: 'mixed vegetables', amount: 2, unit: 'cups', category: 'produce' },
          { name: 'soy sauce', amount: 2, unit: 'tbsp', category: 'pantry' },
          { name: 'olive oil', amount: 1, unit: 'tbsp', category: 'pantry' }
        ],
        instructions: ['Heat oil in pan', 'Cook chicken until done', 'Add vegetables and stir fry', 'Season with soy sauce'],
        nutrition: { calories: 350, protein: 30, carbs: 15, fat: 18, fiber: 4, sugar: 8 },
        estimatedCost: 12.50,
        cookTime: 20,
        prepTime: 10,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'easy',
        cuisine: 'Asian',
        tags: ['healthy', 'quick']
      },
      {
        id: 'recipe-2', 
        title: 'Pasta with Marinara',
        description: 'Classic pasta with homemade marinara sauce',
        ingredients: [
          { name: 'pasta', amount: 1, unit: 'lb', category: 'pantry' },
          { name: 'marinara sauce', amount: 1, unit: 'jar', category: 'pantry' },
          { name: 'parmesan cheese', amount: 0.5, unit: 'cup', category: 'dairy' }
        ],
        instructions: ['Boil pasta according to package directions', 'Heat marinara sauce', 'Combine and serve with cheese'],
        nutrition: { calories: 420, protein: 15, carbs: 65, fat: 12, fiber: 6, sugar: 10 },
        estimatedCost: 8.00,
        cookTime: 15,
        prepTime: 5,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'easy',
        cuisine: 'Italian',
        tags: ['quick', 'vegetarian']
      },
      {
        id: 'recipe-3',
        title: 'Baked Salmon with Vegetables',
        description: 'Healthy baked salmon with roasted vegetables',
        ingredients: [
          { name: 'salmon fillets', amount: 2, unit: 'pieces', category: 'seafood' },
          { name: 'broccoli', amount: 1, unit: 'head', category: 'produce' },
          { name: 'olive oil', amount: 2, unit: 'tbsp', category: 'pantry' },
          { name: 'lemon', amount: 1, unit: 'piece', category: 'produce' }
        ],
        instructions: ['Preheat oven to 400F', 'Season salmon and vegetables', 'Bake for 20 minutes', 'Serve with lemon'],
        nutrition: { calories: 380, protein: 35, carbs: 10, fat: 22, fiber: 5, sugar: 4 },
        estimatedCost: 18.00,
        cookTime: 25,
        prepTime: 10,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'intermediate',
        cuisine: 'American',
        tags: ['healthy', 'omega-3']
      },
      {
        id: 'recipe-4',
        title: 'Turkey and Vegetable Soup',
        description: 'Hearty and nutritious turkey soup with mixed vegetables',
        ingredients: [
          { name: 'ground turkey', amount: 1, unit: 'lb', category: 'meat' },
          { name: 'mixed soup vegetables', amount: 3, unit: 'cups', category: 'produce' },
          { name: 'chicken broth', amount: 4, unit: 'cups', category: 'pantry' },
          { name: 'herbs and spices', amount: 1, unit: 'tsp', category: 'pantry' }
        ],
        instructions: ['Brown turkey in pot', 'Add vegetables and broth', 'Simmer for 30 minutes', 'Season to taste'],
        nutrition: { calories: 280, protein: 25, carbs: 20, fat: 12, fiber: 6, sugar: 8 },
        estimatedCost: 11.00,
        cookTime: 35,
        prepTime: 10,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'easy',
        cuisine: 'American',
        tags: ['healthy', 'comfort-food']
      },
      {
        id: 'recipe-5',
        title: 'Mediterranean Quinoa Bowl',
        description: 'Fresh and healthy quinoa bowl with Mediterranean flavors',
        ingredients: [
          { name: 'quinoa', amount: 1, unit: 'cup', category: 'pantry' },
          { name: 'cherry tomatoes', amount: 2, unit: 'cups', category: 'produce' },
          { name: 'cucumber', amount: 1, unit: 'piece', category: 'produce' },
          { name: 'feta cheese', amount: 0.5, unit: 'cup', category: 'dairy' },
          { name: 'olive oil', amount: 2, unit: 'tbsp', category: 'pantry' }
        ],
        instructions: ['Cook quinoa according to package', 'Chop vegetables', 'Combine all ingredients', 'Drizzle with olive oil'],
        nutrition: { calories: 320, protein: 12, carbs: 45, fat: 14, fiber: 8, sugar: 6 },
        estimatedCost: 9.50,
        cookTime: 20,
        prepTime: 15,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'easy',
        cuisine: 'Mediterranean',
        tags: ['healthy', 'vegetarian']
      },
      {
        id: 'recipe-6',
        title: 'Beef and Broccoli',
        description: 'Classic beef and broccoli stir fry with savory sauce',
        ingredients: [
          { name: 'beef strips', amount: 1, unit: 'lb', category: 'meat' },
          { name: 'broccoli florets', amount: 3, unit: 'cups', category: 'produce' },
          { name: 'teriyaki sauce', amount: 3, unit: 'tbsp', category: 'pantry' },
          { name: 'garlic', amount: 2, unit: 'cloves', category: 'produce' }
        ],
        instructions: ['Cook beef in hot pan', 'Add broccoli and garlic', 'Stir in sauce', 'Cook until tender'],
        nutrition: { calories: 390, protein: 32, carbs: 18, fat: 20, fiber: 5, sugar: 10 },
        estimatedCost: 15.00,
        cookTime: 18,
        prepTime: 12,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'easy',
        cuisine: 'Asian',
        tags: ['healthy', 'quick']
      },
      {
        id: 'recipe-7',
        title: 'Vegetarian Chili',
        description: 'Hearty vegetarian chili with beans and vegetables',
        ingredients: [
          { name: 'mixed beans', amount: 2, unit: 'cans', category: 'pantry' },
          { name: 'diced tomatoes', amount: 1, unit: 'can', category: 'pantry' },
          { name: 'bell peppers', amount: 2, unit: 'pieces', category: 'produce' },
          { name: 'onion', amount: 1, unit: 'piece', category: 'produce' },
          { name: 'chili spices', amount: 2, unit: 'tbsp', category: 'pantry' }
        ],
        instructions: ['Sauté vegetables', 'Add beans and tomatoes', 'Season with spices', 'Simmer for 25 minutes'],
        nutrition: { calories: 310, protein: 18, carbs: 55, fat: 6, fiber: 15, sugar: 12 },
        estimatedCost: 7.50,
        cookTime: 30,
        prepTime: 15,
        servings: preferences.peoplePerMeal || 2,
        difficulty: 'easy',
        cuisine: 'American',
        tags: ['healthy', 'vegetarian', 'high-fiber']
      }
    ]

    const targetRecipes = preferences.mealsPerWeek || 3
    const selectedRecipes = targetRecipes <= fallbackRecipes.length 
      ? fallbackRecipes.slice(0, targetRecipes)
      : [...fallbackRecipes, ...fallbackRecipes.slice(0, targetRecipes - fallbackRecipes.length)]
    
    const mealPlan = {
      id: `plan_${Date.now()}`,
      userId,
      recipes: selectedRecipes,
      backupRecipes: [],
      subtotalEstimate: selectedRecipes.reduce((sum, recipe) => sum + recipe.estimatedCost, 0),
      ingredientMatchPct: 90,
      status: 'draft',
      preferences,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return NextResponse.json({
      success: true,
      planId: mealPlan.id,
      mealPlan,
      fallback: true
    })
  } catch (fallbackError) {
    console.error('Fallback meal plan failed:', fallbackError)
    return NextResponse.json({
      error: 'Service temporarily unavailable'
    }, { status: 503 })
  }
}

function createMealPlanPrompt(preferences: any): string {
  const {
    mealsPerWeek,
    peoplePerMeal,
    mealTypes,
    diets,
    allergies,
    avoidIngredients = [],
    maxCookTime,
    cookingSkillLevel,
    preferredCuisines
  } = preferences

  // Generate 30-40% more recipes than needed for backups
  const totalRecipesToGenerate = Math.ceil(mealsPerWeek * 1.35)

  return `Generate ${totalRecipesToGenerate} diverse recipe ideas for meal planning with the following requirements:

REQUIREMENTS:
- ${mealsPerWeek} meals needed for ${peoplePerMeal} people
- Meal types: ${mealTypes.map((m: any) => m.type).join(', ')}
- Dietary restrictions: ${diets.length > 0 ? diets.join(', ') : 'None'}
- Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Avoid ingredients: ${avoidIngredients.length > 0 ? avoidIngredients.join(', ') : 'None'}
- Max cooking time: ${maxCookTime} minutes
- Cooking skill level: ${cookingSkillLevel}
- Preferred cuisines: ${preferredCuisines.length > 0 ? preferredCuisines.join(', ') : 'Any'}

INSTRUCTIONS:
1. Create recipes that match the dietary restrictions and preferences
2. Ensure cooking time is within the ${maxCookTime} minute limit
3. Match the ${cookingSkillLevel} skill level
4. Include detailed ingredient lists with quantities
5. Provide nutrition information (calories, protein, carbs, fat, fiber)
6. Estimate ingredient cost in USD
7. Vary cuisines and cooking methods for diversity

REQUIRED JSON FORMAT:
{
  "recipes": [
    {
      "id": "recipe-1",
      "title": "Recipe Name",
      "description": "One sentence description",
      "ingredients": [
        {
          "name": "ingredient name",
          "amount": 2,
          "unit": "cups",
          "category": "produce"
        }
      ],
      "instructions": ["Step 1", "Step 2", "Step 3"],
      "nutrition": {
        "calories": 450,
        "protein": 25,
        "carbs": 40,
        "fat": 18,
        "fiber": 8,
        "sugar": 12
      },
      "estimatedCost": 12.50,
      "cookTime": 25,
      "prepTime": 10,
      "servings": ${peoplePerMeal},
      "difficulty": "easy",
      "cuisine": "Italian",
      "tags": ["healthy", "quick"]
    }
  ]
}

Generate exactly ${totalRecipesToGenerate} recipes in this format.`
}