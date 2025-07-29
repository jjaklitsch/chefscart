import OpenAI from 'openai'
import { UserPreferences, Recipe } from '../types'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10000,
      maxRetries: 0, // Disable retries for speed
      httpAgent: undefined, // Let Node.js handle connection pooling
    })
  }
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  return openai
}

// Step 1: Generate unique meal IDEAS in one call
const MEAL_IDEAS_FUNCTION = {
  name: 'generate_meal_ideas',
  description: 'Generate unique meal ideas with basic info',
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
            cookingMethod: { type: 'string' },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
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

// Step 2: Generate details for ONE specific meal
const MEAL_DETAILS_FUNCTION = {
  name: 'generate_meal_details',
  description: 'Generate ingredients and instructions for a specific meal',
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
      instructions: {
        type: 'array',
        items: { type: 'string' }
      },
      nutrition: {
        type: 'object',
        properties: {
          calories: { type: 'number' },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fat: { type: 'number' },
          fiber: { type: 'number' },
          sugar: { type: 'number' }
        }
      }
    },
    required: ['ingredients', 'instructions', 'nutrition']
  }
}

interface MealRequest {
  mealType: string
  day: string
  servings: number
}

interface MealIdea {
  id: string
  title: string
  description: string
  mealType: string
  cuisine: string
  mainProtein: string
  cookingMethod?: string
  difficulty: string
  cookTime: number
  prepTime: number
  servings: number
  estimatedCost: number
}

// Step 1: Generate ALL meal ideas in ONE call (fast + unique)
async function generateMealIdeas(
  requests: MealRequest[],
  preferences: UserPreferences
): Promise<MealIdea[]> {
  
  const mealBreakdown = requests.map((req, i) => 
    `${i+1}. ${req.mealType} for ${req.day} (serves ${req.servings})`
  ).join('\n')

  const prompt = `Generate ${requests.length} unique meals:
${mealBreakdown}

Each must have different protein, cuisine, cooking method. Be brief.`

  try {
    const step1Start = Date.now()
    console.log('🎯 Step 1: Generating unique meal ideas...')
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a creative chef generating diverse meal ideas. Focus on maximum variety - different proteins, cooking methods, cuisines, and bases for each meal.'
        },
        { role: 'user', content: prompt }
      ],
      functions: [MEAL_IDEAS_FUNCTION],
      function_call: { name: 'generate_meal_ideas' },
      temperature: 0.7, // Lower for speed
      max_tokens: 800, // Minimal tokens for speed
    })

    const functionCall = completion.choices[0]?.message?.function_call
    if (functionCall?.name === 'generate_meal_ideas') {
      const result = JSON.parse(functionCall.arguments || '{}')
      const step1Time = Date.now() - step1Start
      console.log(`✅ Step 1 complete: ${result.meals?.length || 0} unique meal ideas in ${step1Time}ms`)
      return result.meals || []
    }
    throw new Error('No meal ideas generated')
  } catch (error) {
    console.error('Error generating meal ideas:', error)
    throw error
  }
}

// Step 2: Generate details for ONE meal (parallel with dedicated client)
async function generateMealDetails(
  mealIdea: MealIdea,
  preferences: UserPreferences
): Promise<Recipe> {
  // Create dedicated client for this call to avoid SDK queueing
  const dedicatedClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    timeout: 8000,
    maxRetries: 0,
  })
  const prompt = `Ingredients and instructions for: "${mealIdea.title}"
${mealIdea.description} (serves ${mealIdea.servings})

Quick: 8 ingredients, 5 steps, nutrition.`

  try {
    const detailStart = Date.now()
    console.log(`🔧 Generating details for: ${mealIdea.title}`)
    const completion = await dedicatedClient.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate detailed ingredients and cooking instructions for the specified meal. Be precise with measurements and clear with instructions.'
        },
        { role: 'user', content: prompt }
      ],
      functions: [MEAL_DETAILS_FUNCTION],
      function_call: { name: 'generate_meal_details' },
      temperature: 0.5, // Very low for speed
      max_tokens: 500, // Minimal for details
    })

    const functionCall = completion.choices[0]?.message?.function_call
    if (functionCall?.name === 'generate_meal_details') {
      const result = JSON.parse(functionCall.arguments || '{}')
      const detailTime = Date.now() - detailStart
      console.log(`  ✅ Details for ${mealIdea.title} complete in ${detailTime}ms`)
      
      return {
        ...mealIdea,
        ingredients: result.ingredients || [],
        instructions: result.instructions || [],
        nutrition: result.nutrition || {
          calories: 450, protein: 25, carbs: 40, fat: 18, fiber: 6, sugar: 8
        },
        tags: [mealIdea.mealType, mealIdea.cuisine],
        imageUrl: null,
        imageLoading: true,
        imageError: false
      }
    }
    throw new Error('No meal details generated')
  } catch (error) {
    console.error(`Error generating details for ${mealIdea.title}:`, error)
    // Return meal with basic details if generation fails
    return {
      ...mealIdea,
      ingredients: [{ name: 'Ingredients temporarily unavailable', amount: 1, unit: 'set', category: 'General' }],
      instructions: ['Recipe details will be available shortly'],
      nutrition: { calories: 450, protein: 25, carbs: 40, fat: 18, fiber: 6, sugar: 8 },
      tags: [mealIdea.mealType, mealIdea.cuisine],
      imageUrl: null,
      imageLoading: true,
      imageError: false
    }
  }
}

// HYBRID APPROACH: 1 blocking call + parallel details
export async function generateMealPlanHybrid(
  preferences: UserPreferences
): Promise<{ recipes: Recipe[], generationTime: number }> {
  const startTime = Date.now()
  
  // Create meal requests
  const requests: MealRequest[] = []
  
  preferences.mealTypes?.forEach(mealType => {
    mealType.days.forEach(day => {
      requests.push({
        mealType: mealType.type,
        day,
        servings: preferences.peoplePerMeal || 2
      })
    })
  })

  console.log(`🚀 HYBRID: Generating ${requests.length} meals (1 blocking + ${requests.length} parallel)`)

  if (requests.length === 0) {
    throw new Error('No meals requested')
  }

  try {
    // STEP 1: Generate unique meal ideas (BLOCKING - ensures uniqueness)
    const step1Start = Date.now()
    const mealIdeas = await generateMealIdeas(requests, preferences)
    const step1Time = Date.now() - step1Start
    
    if (mealIdeas.length === 0) {
      throw new Error('No meal ideas generated')
    }

    console.log(`🎯 Step 1 COMPLETE: ${mealIdeas.length} unique ideas in ${step1Time}ms`)

    // STEP 2: Generate details for each meal (PARALLEL - for speed)
    const step2Start = Date.now()
    console.log(`⚡ Step 2: Generating details for ${mealIdeas.length} meals in TRUE PARALLEL...`)
    
    const detailPromises = mealIdeas.map((idea, index) => {
      console.log(`  🚀 Starting parallel call ${index + 1}/${mealIdeas.length}: ${idea.title}`)
      return Promise.race([
        generateMealDetails(idea, preferences),
        new Promise<Recipe>((_, reject) => 
          setTimeout(() => reject(new Error(`Details timeout for ${idea.title}`)), 8000) // Realistic 8s timeout
        )
      ]).catch(error => {
        console.warn(`Failed to generate details for ${idea.title}:`, error.message)
        // Return basic meal if details fail
        return {
          ...idea,
          ingredients: [{ name: 'Ingredients list pending', amount: 1, unit: 'set', category: 'General' }],
          instructions: ['Recipe instructions will be available shortly'],
          nutrition: { calories: 450, protein: 25, carbs: 40, fat: 18, fiber: 6, sugar: 8 },
          tags: [idea.mealType, idea.cuisine],
          imageUrl: null,
          imageLoading: true,
          imageError: false
        } as Recipe
      })
    })

    const recipes = await Promise.all(detailPromises)
    const step2Time = Date.now() - step2Start
    
    const generationTime = Date.now() - startTime
    console.log(`⚡ Step 2 COMPLETE: Details generated in ${step2Time}ms`)
    console.log(`✅ HYBRID COMPLETE: ${recipes.length} recipes in ${generationTime}ms`)
    console.log(`📊 Breakdown: Ideas=${step1Time}ms, Details=${step2Time}ms, Total=${generationTime}ms`)

    return { recipes, generationTime }

  } catch (error) {
    console.error('Hybrid meal generation failed:', error)
    throw error
  }
}