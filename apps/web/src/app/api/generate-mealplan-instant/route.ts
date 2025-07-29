import { NextRequest, NextResponse } from 'next/server'
import type { UserPreferences } from '../../../../types'
// Note: We'll inline the makeOpenAIRequest function here to avoid importing the full library
import https from 'https'

// Pure HTTP OpenAI API call with retry logic
async function makeOpenAIRequest(
  messages: any[], 
  functions?: any[], 
  functionCall?: any,
  maxRetries: number = 2
): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        const postData = JSON.stringify({
          model: 'gpt-4.1-mini',
          messages,
          ...(functions && { functions }),
          ...(functionCall && { function_call: functionCall }),
          temperature: 0.7,
          max_tokens: 1000
        })

        const options = {
          hostname: 'api.openai.com',
          port: 443,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Connection': 'close' // Force new connection for true parallel
          },
          timeout: 30000 // Reasonable 30s timeout
        }

        const req = https.request(options, (res) => {
          let data = ''
          res.on('data', (chunk) => { data += chunk })
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data)
              
              // Check for OpenAI API errors
              if (parsed.error) {
                reject(new Error(`OpenAI API error: ${parsed.error.message || 'Unknown error'}`))
                return
              }
              
              resolve(parsed)
            } catch (e) {
              reject(new Error(`JSON parse error: ${e instanceof Error ? e.message : e}`))
            }
          })
        })

        req.on('error', reject)
        req.on('timeout', () => {
          req.destroy()
          reject(new Error('Request timeout'))
        })
        
        req.setTimeout(30000) // 30s timeout
        req.write(postData)
        req.end()
      })
      
      return result // Success, return result
      
    } catch (error) {
      const isLastAttempt = attempt === maxRetries
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      console.log(`OpenAI request attempt ${attempt + 1}/${maxRetries + 1} failed: ${errorMessage}`)
      
      if (isLastAttempt) {
        throw error // Final attempt failed, throw error
      }
      
      // Retry with exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000)
      console.log(`Retrying in ${backoffMs}...`)
      await new Promise(resolve => setTimeout(resolve, backoffMs))
    }
  }
  
  throw new Error('All retry attempts failed')
}

const MEAL_IDEAS_FUNCTION = {
  name: 'generate_meal_ideas',
  description: 'Generate unique meal ideas',
  parameters: {
    type: 'object',
    properties: {
      meals: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            mealType: { type: 'string' },
            cuisine: { type: 'string' },
            mainProtein: { type: 'string' },
            difficulty: { type: 'string' },
            cookTime: { type: 'number' },
            prepTime: { type: 'number' },
            servings: { type: 'number' },
            estimatedCost: { type: 'number' }
          },
          required: ['id', 'title', 'description', 'mealType', 'cuisine', 'mainProtein']
        }
      }
    },
    required: ['meals']
  }
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { preferences } = await request.json()

    if (!preferences) {
      return NextResponse.json({
        error: 'Preferences are required'
      }, { status: 400 })
    }

    console.log('⚡ Starting INSTANT meal generation - titles only!')
    
    const overallStart = Date.now()

    // Create meal requests
    const requests: Array<{mealType: string, day: string, servings: number}> = []
    preferences.mealTypes?.forEach((mealType: any) => {
      mealType.days.forEach((day: any) => {
        requests.push({
          mealType: mealType.type,
          day,
          servings: preferences.peoplePerMeal || 2
        })
      })
    })

    if (requests.length === 0) {
      throw new Error('No meals requested')
    }

    // ONLY generate meal ideas/titles - no ingredients or instructions yet
    const mealBreakdown = requests.map((req, i) => 
      `${i+1}. ${req.mealType} for ${req.day} (serves ${req.servings})`
    ).join('\n')

    const mealTypeGroups = requests.reduce((groups: Record<string, any[]>, req) => {
      if (!groups[req.mealType]) groups[req.mealType] = []
      groups[req.mealType]!.push(req)
      return groups
    }, {})

    const mealTypeBreakdown = Object.entries(mealTypeGroups)
      .map(([type, reqs]) => `${reqs.length} ${type} meals (serves ${reqs[0].servings} each)`)
      .join(', ')

    const ideasResponse = await makeOpenAIRequest(
      [
        { role: 'system', content: 'Generate unique meal ideas with different proteins and cuisines. Focus on creating appealing titles and brief descriptions only.' },
        { role: 'user', content: `Generate ${requests.length} unique meals organized by type: ${mealTypeBreakdown}

Individual meal requests:
${mealBreakdown}

Requirements:
- Each must have different protein, cuisine, cooking method within its meal type
- mealType field must match exactly: breakfast, lunch, dinner, or snack
- Breakfast: Focus on morning foods (eggs, pancakes, oatmeal, yogurt bowls)
- Lunch: Light-to-moderate meals (salads, sandwiches, soups, wraps)  
- Dinner: Heartier meals (proteins with sides, casseroles, full plates)
- Snack: Light bites (smoothies, trail mix, fruit with nuts)
- estimatedCost should be realistic for US grocery stores (total for all servings)
- Focus on creating appealing titles and descriptions - ingredients/instructions will be generated later` }
      ],
      [MEAL_IDEAS_FUNCTION],
      { name: 'generate_meal_ideas' }
    )

    const functionCall = ideasResponse.choices?.[0]?.message?.function_call
    if (!functionCall || functionCall.name !== 'generate_meal_ideas') {
      throw new Error('No meal ideas generated')
    }

    const mealIdeas = JSON.parse(functionCall.arguments).meals || []
    
    // Create recipes with minimal data and loading states
    const recipes = mealIdeas.map((idea: any) => ({
      id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: idea.title,
      description: idea.description,
      mealType: idea.mealType,
      cuisine: idea.cuisine || 'American',
      difficulty: idea.difficulty || 'Medium',
      servings: idea.servings || preferences.peoplePerMeal || 2,
      prepTime: idea.prepTime || 15,
      cookTime: idea.cookTime || 30,
      estimatedCost: idea.estimatedCost || 12,
      // Set loading states for content that will be generated later
      ingredients: [],
      instructions: [],
      ingredientsLoading: true,
      instructionsLoading: true,
      nutrition: null,
      tags: [idea.mealType, idea.cuisine || 'American'],
      imageUrl: null,
      imageLoading: true,
      imageError: false
    }))

    const overallTime = Date.now() - overallStart
    console.log(`✅ INSTANT generation complete: ${recipes.length} recipe titles in ${overallTime}ms`)

    // Build meal plan response with minimal data
    const mealPlan = {
      id: `plan_${Date.now()}`,
      userId: `temp_${Date.now()}`,
      recipes: recipes,
      subtotalEstimate: recipes.reduce((sum: number, recipe: any) => sum + (recipe.estimatedCost * recipe.servings), 0),
      ingredientMatchPct: 95,
      status: 'partial', // Indicate this is partial data
      preferences,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return NextResponse.json({
      success: true,
      planId: mealPlan.id,
      mealPlan,
      generationTime: overallTime,
      isPartial: true // Flag to indicate ingredients/instructions need to be generated
    })

  } catch (error) {
    console.error('❌ Instant meal generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate meal plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}