import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface IngredientCategorization {
  name: string
  category: string
  reasoning: string
}

export async function POST(request: NextRequest) {
  try {
    const { ingredients } = await request.json()

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

    const ingredientList = ingredients.map((ing: any) => 
      `- ${ing.name} (${ing.amount} ${ing.unit})`
    ).join('\n')

    const prompt = `You are a grocery categorization expert. Categorize these ingredients into appropriate grocery store sections:

Ingredients to categorize:
${ingredientList}

Use these standard grocery store categories:
- Fresh Produce (fruits, vegetables, herbs)
- Meat & Seafood (all proteins including deli meats)
- Dairy & Eggs (milk, cheese, yogurt, eggs, butter)
- Pantry & Dry Goods (pasta, rice, flour, canned goods, spices)
- Condiments & Sauces (dressings, oils, vinegars, sauces)
- Frozen Foods (frozen vegetables, ice cream, frozen meals)
- Bakery (bread, tortillas, baked goods)
- Beverages (juices, sodas, water, wine, beer)
- Household Items (cleaning supplies, paper products)
- Other (items that don't fit standard categories)

Consider the ingredient's primary use and where customers typically find it in stores.

Return a JSON array with exact format:
[
  {
    "name": "ingredient name",
    "category": "category name from list above",
    "reasoning": "brief explanation of categorization"
  }
]`

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
            content: 'You are a grocery store expert. Always categorize ingredients accurately based on where customers would find them in a typical supermarket.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
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
      throw new Error('No content returned from categorization')
    }

    let categorizations: IngredientCategorization[] = []
    try {
      const parsed = JSON.parse(content)
      
      // Handle multiple possible response formats
      if (Array.isArray(parsed)) {
        categorizations = parsed
      } else if (parsed.categorizations && Array.isArray(parsed.categorizations)) {
        categorizations = parsed.categorizations
      } else if (parsed.ingredients && Array.isArray(parsed.ingredients)) {
        categorizations = parsed.ingredients
      } else {
        // Try to extract from any array property
        const arrayValues = Object.values(parsed).find(value => Array.isArray(value))
        if (arrayValues) {
          categorizations = arrayValues as IngredientCategorization[]
        }
      }
      
    } catch (parseError) {
      console.error('Failed to parse categorizations:', parseError)
      
      // Fallback to basic categorization
      categorizations = ingredients.map((ing: any) => ({
        name: ing.name,
        category: 'Other',
        reasoning: 'AI parsing failed, using fallback category'
      }))
    }

    // Validate categorizations
    const validCategorizations = categorizations
      .filter((cat: any) => cat.name && cat.category)
      .map((cat: any) => ({
        name: cat.name.trim(),
        category: cat.category.trim(),
        reasoning: cat.reasoning || 'AI categorization'
      }))


    return NextResponse.json({
      success: true,
      categorizations: validCategorizations
    })

  } catch (error) {
    console.error('Error categorizing ingredients:', error)
    return NextResponse.json({
      error: 'Failed to categorize ingredients',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}