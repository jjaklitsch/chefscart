import OpenAI from 'openai'
import { UserPreferences, Recipe } from '../types'

// Initialize OpenAI client only when needed to avoid build-time errors
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  return openai
}

// Function schema for structured recipe generation
const RECIPE_GENERATION_FUNCTION = {
  name: 'generate_recipes',
  description: 'Generate a collection of recipes for meal planning',
  parameters: {
    type: 'object',
    properties: {
      recipes: {
        type: 'array',
        description: 'Array of recipe objects',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique recipe identifier' },
            title: { type: 'string', description: 'Recipe name' },
            description: { type: 'string', description: 'Brief recipe description' },
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
              },
              required: ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar']
            },
            estimatedCost: { type: 'number', description: 'Estimated ingredient cost in USD' },
            cookTime: { type: 'number', description: 'Cooking time in minutes' },
            prepTime: { type: 'number', description: 'Preparation time in minutes' },
            servings: { type: 'number', description: 'Number of servings' },
            difficulty: { 
              type: 'string', 
              enum: ['easy', 'medium', 'hard'],
              description: 'Recipe difficulty level'
            },
            cuisine: { type: 'string', description: 'Cuisine type' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Recipe tags and categories'
            }
          },
          required: ['id', 'title', 'description', 'ingredients', 'instructions', 'nutrition', 'estimatedCost', 'cookTime', 'prepTime', 'servings', 'difficulty', 'cuisine', 'tags']
        }
      }
    },
    required: ['recipes']
  }
}

export interface MealPlanGenerationOptions {
  preferences: UserPreferences
  pantryItems?: string[]
  timeoutMs?: number
}

export interface MealPlanResult {
  recipes: Recipe[]
  backupRecipes: Recipe[]
  generationTime: number
}

export async function generateMealPlanWithFunctionCalling(
  options: MealPlanGenerationOptions
): Promise<MealPlanResult> {
  const { preferences, pantryItems = [], timeoutMs = 4500 } = options
  const startTime = Date.now()

  // Generate reasonable backup recipes (100% more) to avoid timeout
  const totalRecipesToGenerate = Math.ceil(preferences.mealsPerWeek * 2)
  
  const prompt = createMealPlanPrompt(preferences, pantryItems, totalRecipesToGenerate)

  try {
    const completion = await Promise.race([
      getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a master recipe developer for Home Chef, the premium meal kit service. Create restaurant-quality recipes with the same level of detail and precision as Home Chef's instruction cards. Every recipe must be foolproof for home cooks with detailed prep work, cooking techniques, and visual cues.

CRITICAL REQUIREMENTS:
- Include ALL ingredients with precise measurements: tablespoons, teaspoons, ounces, pounds, cups, etc.
- Include ALL pantry staples: salt, black pepper, olive oil, vegetable oil, butter, flour, sugar, etc.
- Specify exact preparation for each ingredient: "diced", "minced", "chopped", "sliced thin", "cut into 1-inch pieces"
- Write comprehensive cooking instructions with prep steps, seasoning details, doneness cues, and timing
- Include equipment needed: "large skillet", "rimmed baking sheet", "medium saucepan", etc.
- Always specify temperatures, cooking times, and visual/textural doneness indicators

Always generate exactly the requested number of recipes with Home Chef level detail.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        functions: [RECIPE_GENERATION_FUNCTION],
        function_call: { name: 'generate_recipes' },
        temperature: 0.9, // Maximum creativity for unique, diverse recipes
        max_tokens: 6000, // Balanced tokens for detailed recipes
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI request timeout')), timeoutMs)
      )
    ])

    const functionCall = completion.choices[0]?.message?.function_call
    if (!functionCall || functionCall.name !== 'generate_recipes') {
      throw new Error('No function call in OpenAI response')
    }

    let parsedRecipes: { recipes: Recipe[] }
    try {
      parsedRecipes = JSON.parse(functionCall.arguments)
    } catch (parseError) {
      console.error('Failed to parse function call arguments:', parseError)
      throw new Error('Invalid JSON in function call response')
    }

    const recipes = parsedRecipes.recipes || []
    
    // Validate that we got recipes
    if (recipes.length === 0) {
      throw new Error('No recipes generated by OpenAI')
    }

    // Split into primary and backup recipes
    const primaryRecipes = recipes.slice(0, preferences.mealsPerWeek)
    const backupRecipes = recipes.slice(preferences.mealsPerWeek)

    const generationTime = Date.now() - startTime

    return {
      recipes: primaryRecipes,
      backupRecipes,
      generationTime
    }

  } catch (error) {
    const generationTime = Date.now() - startTime
    console.error('OpenAI function calling error:', error)
    
    // Re-throw with additional context
    if (error instanceof Error) {
      throw new Error(`OpenAI generation failed (${generationTime}ms): ${error.message}`)
    }
    throw new Error(`OpenAI generation failed (${generationTime}ms): Unknown error`)
  }
}

function createMealPlanPrompt(
  preferences: UserPreferences, 
  pantryItems: string[], 
  totalRecipesToGenerate: number
): string {
  const {
    mealsPerWeek,
    peoplePerMeal,
    mealTypes,
    diets,
    allergies,
    avoidIngredients = [],
    maxCookTime,
    cookingSkillLevel,
    preferredCuisines,
    organicPreference
  } = preferences

  const mealTypesString = mealTypes.map(m => `${m.type} (${m.days.join(', ')})`).join('; ')
  const pantryString = pantryItems.length > 0 ? pantryItems.join(', ') : 'None specified'

  return `Create ${totalRecipesToGenerate} diverse, delicious recipes for meal planning. Primary need: ${mealsPerWeek} meals for ${peoplePerMeal} people.

STRICT REQUIREMENTS:
- Meal types: ${mealTypesString}
- Dietary restrictions: ${diets.length > 0 ? diets.join(', ') : 'None'}
- Allergies to avoid: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Ingredients to avoid: ${avoidIngredients.length > 0 ? avoidIngredients.join(', ') : 'None'}
- Maximum total time (prep + cook): ${maxCookTime} minutes
- Cooking skill level: ${cookingSkillLevel}
- Preferred cuisines: ${preferredCuisines.length > 0 ? preferredCuisines.join(', ') : 'Any'}
- Organic preference: ${organicPreference}
- Available pantry items: ${pantryString}

OPTIMIZATION GOALS:
1. ENSURE ABSOLUTE UNIQUENESS - Never generate duplicate or similar dishes
2. Maximize variety across cuisines, proteins, and cooking methods  
3. Use creative, internationally-inspired recipes with unique flavor profiles
4. Balance nutrition across all meals (aim for 400-600 calories per serving)
5. Optimize ingredient overlap to reduce shopping complexity
6. Consider seasonal availability and cost-effectiveness
7. Match difficulty to stated skill level
8. Utilize pantry items when possible to reduce costs
9. Include fusion cuisines and modern cooking techniques for creativity

RECIPE REQUIREMENTS:
- Generate exactly ${totalRecipesToGenerate} COMPLETELY UNIQUE recipes (no duplicates or variations)
- Each recipe serves ${peoplePerMeal} people
- Include precise ingredient quantities and clear instructions
- Provide accurate nutrition information
- Estimate realistic ingredient costs (USD)
- Use diverse cooking techniques (baking, grilling, stovetop, air frying, slow cooking, etc.)
- Ensure recipes can be completed within time constraints
- Make each recipe distinctly different in cuisine, protein, and preparation method
- Include creative, restaurant-quality dishes with global inspiration

CREATIVE PRESENTATION:
- Write detailed titles like meal kit services: "Pan-Seared Chicken with Lemon-Herb Couscous & Roasted Brussels Sprouts"
- Include primary protein, cooking method, accompaniments, and key flavor profiles in titles
- Create descriptions that highlight flavors, textures, and what makes the dish special (e.g., "Tender chicken breast seasoned with thyme and rosemary, served over fluffy couscous tossed with fresh herbs and lemon zest, alongside caramelized Brussels sprouts")
- Focus on the eating experience and flavor combinations
- Be specific about herbs, spices, and special ingredients

INGREDIENT REQUIREMENTS (Home Chef Standard):
- List EVERY ingredient including pantry staples: salt, black pepper, olive oil, butter, flour, etc.
- Use precise measurements: "2 tablespoons extra-virgin olive oil", "1 teaspoon kosher salt", "1/2 teaspoon freshly ground black pepper"
- Include exact prep in ingredient name: "1 large yellow onion, diced", "3 cloves garlic, minced", "1 lb boneless skinless chicken breasts, cut into 1-inch pieces"
- Specify produce details: "2 medium zucchini (about 1 lb), sliced into half-moons", "1 large lemon, zested and juiced"
- Include package specifications: "1 (14.5 oz) can diced tomatoes, drained", "8 oz block cream cheese, softened"

COOKING INSTRUCTIONS (Home Chef Detail Level):
- Start with prep work: "Preheat oven to 425°F. Line a rimmed baking sheet with parchment paper."
- Include equipment for each step: "In a large skillet over medium-high heat", "Using a wooden spoon"
- Specify exact cooking techniques: "Add chicken and cook, stirring occasionally, 6-8 minutes until golden brown and cooked through (internal temperature of 165°F)"
- Include seasoning details: "Season chicken with 1/2 teaspoon salt and 1/4 teaspoon pepper"
- Provide visual and textural cues: "Cook onions 3-4 minutes until softened and translucent", "Simmer 2-3 minutes until sauce thickens and coats the back of a spoon"
- Add finishing touches: "Remove from heat and stir in 2 tablespoons fresh chopped parsley"
- Include plating instructions: "Divide rice among plates and top with chicken mixture. Garnish with remaining parsley and serve with lemon wedges."

Focus on creating a cohesive meal plan that's exciting, nutritious, and practical for the specified preferences.`
}

export { RECIPE_GENERATION_FUNCTION }