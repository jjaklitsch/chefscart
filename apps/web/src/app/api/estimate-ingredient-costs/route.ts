import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface IngredientCostRequest {
  name: string
  amount: number
  unit: string
}

interface IngredientCostResponse {
  name: string
  estimatedCost: number
  reasoning: string
  nutrition?: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ingredients, zipCode } = await request.json()

    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json({
        error: 'Ingredients array is required'
      }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'OpenAI API key not configured'
      }, { status: 500 })
    }

    // Batch ingredients for efficient AI processing
    const ingredientList = ingredients.map((ing: IngredientCostRequest) => 
      `- ${ing.amount} ${ing.unit} ${ing.name}`
    ).join('\n')

    const zipInfo = zipCode ? ` in zip code ${zipCode}` : ''

    const prompt = `You are a grocery pricing expert. Estimate realistic costs for these ingredients${zipInfo} based on current US grocery store prices (like Kroger, Safeway, or similar mainstream stores).

Ingredients to price:
${ingredientList}

Consider:
- Current 2024-2025 pricing trends
- Regional variations${zipCode ? ` for ${zipCode}` : ''}
- Typical packaging sizes (e.g., milk comes in gallons, eggs in dozens)
- Seasonal availability
- Average quality (not premium, not budget)

Also provide basic nutrition information per serving of each ingredient.

Return a JSON array with exact format:
[
  {
    "name": "ingredient name",
    "estimatedCost": 4.99,
    "reasoning": "brief explanation of pricing logic",
    "nutrition": {
      "calories": 150,
      "protein": 8,
      "carbs": 12,
      "fat": 5,
      "fiber": 2
    }
  }
]

Be precise with decimal pricing and nutrition values. Account for the actual quantities requested, not just unit prices.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a precise grocery pricing expert. Always return valid JSON with exact decimal pricing.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenAI API error ${response.status}:`, errorText)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content returned from cost estimation')
    }

    let costEstimates: IngredientCostResponse[] = []
    try {
      const parsed = JSON.parse(content)
      
      // Handle multiple possible response formats
      if (Array.isArray(parsed)) {
        costEstimates = parsed
      } else if (parsed.estimates && Array.isArray(parsed.estimates)) {
        costEstimates = parsed.estimates
      } else if (parsed.ingredients && Array.isArray(parsed.ingredients)) {
        costEstimates = parsed.ingredients
      } else if (parsed.costs && Array.isArray(parsed.costs)) {
        costEstimates = parsed.costs
      } else {
        // Try to extract from any array property
        const arrayValues = Object.values(parsed).find(value => Array.isArray(value))
        if (arrayValues) {
          costEstimates = arrayValues as IngredientCostResponse[]
        }
      }
      
    } catch (parseError) {
      console.error('Failed to parse cost estimates:', parseError)
      
      // Fallback to heuristic pricing if AI fails
      costEstimates = ingredients.map((ing: IngredientCostRequest) => ({
        name: ing.name,
        estimatedCost: Math.max(1.99, ing.amount * 2), // Simple fallback
        reasoning: 'AI parsing failed, using fallback estimate'
      }))
    }


    return NextResponse.json({
      success: true,
      estimates: costEstimates,
      zipCode,
      totalEstimatedCost: costEstimates.reduce((sum, est) => sum + est.estimatedCost, 0)
    })

  } catch (error) {
    console.error('Error estimating ingredient costs:', error)
    return NextResponse.json({
      error: 'Failed to estimate ingredient costs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}