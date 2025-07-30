import https from 'https'
import { UserPreferences, Recipe } from '../types'

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
          model: 'gpt-4o-mini',
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
      console.log(`Retrying in ${backoffMs}ms...`)
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

const MEAL_DETAILS_FUNCTION = {
  name: 'generate_meal_details',
  description: 'Generate ingredients and instructions',
  parameters: {
    type: 'object',
    properties: {
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            amount: { type: 'number' },
            unit: { type: 'string' },
            category: { type: 'string' }
          },
          required: ['name', 'amount', 'unit']
        }
      },
      instructions: { type: 'array', items: { type: 'string' } },
      nutrition: {
        type: 'object',
        properties: {
          calories: { type: 'number' }, protein: { type: 'number' },
          carbs: { type: 'number' }, fat: { type: 'number' },
          fiber: { type: 'number' }, sugar: { type: 'number' }
        }
      }
    },
    required: ['ingredients', 'instructions', 'nutrition']
  }
}

// TRUE PARALLEL: Generate ALL meal plans using pure HTTP
export async function generateMealPlanPureHTTP(
  preferences: UserPreferences
): Promise<{ recipes: Recipe[], generationTime: number }> {
  const startTime = Date.now()
  
  // Create meal requests
  const requests: Array<{mealType: string, day: string, servings: number}> = []
  preferences.mealTypes?.forEach(mealType => {
    mealType.days.forEach(day => {
      requests.push({
        mealType: mealType.type,
        day,
        servings: preferences.peoplePerMeal || 2
      })
    })
  })

  console.log(`⚡ PURE HTTP: Generating ${requests.length} meals with TRUE PARALLEL execution`)

  if (requests.length === 0) {
    throw new Error('No meals requested')
  }

  try {
    // STEP 1: Generate meal ideas (blocking)
    const step1Start = Date.now()
    console.log('🎯 Step 1: Generating meal ideas...')
    
    const mealBreakdown = requests.map((req, i) => 
      `${i+1}. ${req.mealType} for ${req.day} (serves ${req.servings})`
    ).join('\n')

    // Group requests by meal type for better AI organization
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
        { role: 'system', content: 'Generate unique meal ideas with different proteins and cuisines. Provide realistic cost estimates based on current 2024-2025 grocery prices. Ensure meal types are clearly defined and appropriate for the time of day.' },
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
- estimatedCost should be the TOTAL cost for all servings (not per-serving)
- Base cost estimates on realistic US grocery store prices:
  * Simple meals (pasta, rice dishes): $8-15 total
  * Chicken/pork meals: $12-20 total  
  * Beef meals: $18-28 total
  * Seafood meals: $20-35 total
  * Vegetarian meals: $6-12 total
  * Breakfast meals: $6-18 total
  * Snacks: $3-10 total
- Consider ingredients needed, seasonal availability, and mainstream grocery store pricing
- Account for the number of servings when calculating total cost` }
      ],
      [MEAL_IDEAS_FUNCTION],
      { name: 'generate_meal_ideas' }
    )

    const functionCall = ideasResponse.choices?.[0]?.message?.function_call
    if (!functionCall || functionCall.name !== 'generate_meal_ideas') {
      throw new Error('No meal ideas generated')
    }

    const mealIdeas = JSON.parse(functionCall.arguments).meals || []
    const step1Time = Date.now() - step1Start
    console.log(`✅ Step 1 complete: ${mealIdeas.length} ideas in ${step1Time}ms`)

    // STEP 2: Generate details in TRUE PARALLEL using pure HTTP
    const step2Start = Date.now()
    console.log(`⚡ Step 2: Generating details for ${mealIdeas.length} meals in TRUE PARALLEL...`)
    
    const detailPromises = mealIdeas.map((idea: any, index: number) => {
      console.log(`  🚀 Starting TRUE PARALLEL call ${index + 1}: ${idea.title}`)
      const callStart = Date.now()
      
      return makeOpenAIRequest(
        [
          { role: 'system', content: 'Generate ingredients and instructions efficiently.' },
          { role: 'user', content: `Generate complete ingredients and instructions for: "${idea.title}"\n\nDescription: ${idea.description}\nServes: ${idea.servings} people\nCuisine: ${idea.cuisine}\nDifficulty: ${idea.difficulty}\n\nProvide:\n- Complete ingredients list (include everything needed)\n- For meat/protein items, include both piece count and weight (e.g., "2 chicken breasts, 0.5 lb each" or "1 lb ground beef")\n- For other ingredients, use practical cooking measurements\n- Clear cooking instructions (no more than 20 steps)\n- Accurate nutrition information\n\nMake it realistic and practical for home cooking with proper portion sizes.` }
        ],
        [MEAL_DETAILS_FUNCTION],
        { name: 'generate_meal_details' },
        2 // 2 retries for details
      ).then(response => {
        const callTime = Date.now() - callStart
        console.log(`  ✅ TRUE PARALLEL call ${index + 1} complete in ${callTime}ms`)
        
        const detailCall = response.choices?.[0]?.message?.function_call
        if (detailCall?.name === 'generate_meal_details') {
          const details = JSON.parse(detailCall.arguments)
          return {
            ...idea,
            ingredients: details.ingredients || [],
            instructions: details.instructions || [],
            nutrition: details.nutrition || { calories: 450, protein: 25, carbs: 40, fat: 18, fiber: 6, sugar: 8 },
            tags: [idea.mealType, idea.cuisine],
            imageUrl: null,
            imageLoading: true,
            imageError: false
          }
        }
        throw new Error('No details generated')
      }).catch(error => {
        console.warn(`Failed to generate details for ${idea.title}:`, error.message)
        // Return basic meal structure
        return {
          ...idea,
          ingredients: [{ name: 'Ingredients pending', amount: 1, unit: 'set', category: 'General' }],
          instructions: ['Instructions will be available shortly'],
          nutrition: { calories: 450, protein: 25, carbs: 40, fat: 18, fiber: 6, sugar: 8 },
          tags: [idea.mealType, idea.cuisine],
          imageUrl: null,
          imageLoading: true,
          imageError: false
        }
      })
    })

    const recipes = await Promise.all(detailPromises)
    const step2Time = Date.now() - step2Start
    
    // Use the existing estimated costs from Step 1 (from GPT ideas generation)
    // Remove the problematic self-referencing API call for production reliability
    const generationTime = Date.now() - startTime
    console.log(`✅ PURE HTTP COMPLETE: ${recipes.length} recipes in ${generationTime}ms`)
    console.log(`📊 Breakdown: Ideas=${step1Time}ms, Details=${step2Time}ms (TRUE PARALLEL!)`)
    console.log(`🎉 Average: ${Math.round(generationTime / recipes.length)}ms per recipe`)

    return { recipes, generationTime }

  } catch (error) {
    console.error('Pure HTTP meal generation failed:', error)
    throw error
  }
}

// Generate replacement recipe using pure HTTP
export async function generateReplacementRecipeHTTP(
  prompt: string,
  functionSchema: any,
  functionName: string
): Promise<any> {
  try {
    const response = await makeOpenAIRequest(
      [
        {
          role: 'system',
          content: 'You are a recipe replacement generator. Create a completely different, detailed recipe as an alternative to the one being replaced. Ensure variety and follow user preferences.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      [functionSchema],
      { name: functionName },
      2 // 2 retries
    )

    const functionCall = response.choices?.[0]?.message?.function_call
    if (!functionCall || functionCall.name !== functionName) {
      throw new Error('No replacement recipe generated')
    }

    return JSON.parse(functionCall.arguments)
  } catch (error) {
    console.error('Error generating replacement recipe:', error)
    throw error
  }
}