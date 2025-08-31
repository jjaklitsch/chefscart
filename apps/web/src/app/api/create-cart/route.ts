import { NextRequest, NextResponse } from 'next/server'

// Retry utility with exponential backoff
class RetryHandler {
  private maxAttempts = 3
  private initialDelayMs = 1000
  private backoffMultiplier = 2
  private maxDelayMs = 30000

  private isRetryableError(status: number): boolean {
    return [429, 500, 502, 503, 504].includes(status)
  }

  private calculateDelay(attempt: number): number {
    const baseDelay = this.initialDelayMs * Math.pow(this.backoffMultiplier, attempt - 1)
    const cappedDelay = Math.min(baseDelay, this.maxDelayMs)
    // Add jitter ±25% to prevent thundering herd
    const jitter = cappedDelay * 0.25
    const randomJitter = (Math.random() - 0.5) * 2 * jitter
    return Math.max(0, cappedDelay + randomJitter)
  }

  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        lastError = error
        
        // Don't retry client errors (400, 401, 403, 404)
        if (error.status && !this.isRetryableError(error.status)) {
          throw error
        }
        
        // Final attempt - don't delay
        if (attempt === this.maxAttempts) {
          throw error
        }
        
        const delay = this.calculateDelay(attempt)
        console.log(`Instacart API attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`, {
          status: error.status,
          message: error.message
        })
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planId, userId, mealPlanData, email, userPreferences, zipCode } = body

    if (!planId) {
      return NextResponse.json({
        error: 'Missing plan ID'
      }, { status: 400 })
    }


    // Get the meal plan data from the request
    let consolidatedCart: any[] = []
    
    if (mealPlanData && mealPlanData.consolidatedCart) {
      consolidatedCart = mealPlanData.consolidatedCart
    } else {
      console.error('No consolidated cart data found in request')
    }

    // Check if we have Instacart API key
    const INSTACART_API_KEY = process.env.INSTACART_API_KEY
    const INSTACART_BASE_URL = process.env.INSTACART_IDP_BASE_URL || 'https://connect.instacart.com'
    
    console.log('Instacart config:', {
      hasApiKey: !!INSTACART_API_KEY,
      baseUrl: INSTACART_BASE_URL,
      apiKeyPrefix: INSTACART_API_KEY ? INSTACART_API_KEY.substring(0, 10) + '...' : 'none'
    })
    
    if (!INSTACART_API_KEY) {
      
      if (consolidatedCart.length === 0) {
        console.error('No items to create cart with')
        return NextResponse.json({
          error: 'No items found to create cart',
          details: 'Cart is empty'
        }, { status: 400 })
      }
      
      // Create comprehensive Instacart search URL with all ingredients
      const allIngredients = consolidatedCart
        .map(item => (item.shoppableName || item.name))
        .join(' ')
      
      const instacartUrl = `https://www.instacart.com/store/search?k=${encodeURIComponent(allIngredients)}`
      
      // Send email even for no-API-key fallback
      if (email && mealPlanData?.mealPlan && consolidatedCart.length > 0) {
        try {
          const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/send-meal-plan-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              cartUrl: instacartUrl,
              mealPlan: mealPlanData.mealPlan,
              consolidatedCart,
              userPreferences: { ...userPreferences, zipCode }
            })
          })

          if (!emailResponse.ok) {
            console.error('Failed to send no-API-key fallback email:', await emailResponse.text())
          } else {
          }
        } catch (emailError) {
          console.error('Error sending no-API-key fallback email:', emailError)
        }
      }
      
      const mockData = {
        success: true,
        cartUrl: instacartUrl,
        cartId: `fallback_cart_${planId}_${Date.now()}`,
        message: 'Redirecting to Instacart search with your ingredients (API key not configured)'
      }
      
      return NextResponse.json(mockData)
    }

    // Use Instacart Partner API to create proper shopping list
    
    if (consolidatedCart.length === 0) {
      console.error('No items to create shopping list with')
      return NextResponse.json({
        error: 'No items found to create shopping list',
        details: 'Shopping cart is empty'
      }, { status: 400 })
    }

    // Transform consolidated cart to Instacart line items format
    const lineItems = consolidatedCart.map(item => ({
      name: item.shoppableName || item.name,
      quantity: Math.max(1, Math.round(item.shoppingQuantity || item.amount || 1)),
      unit: item.shoppingUnit || item.unit || 'each'
    }))

    console.log('Creating shopping list with', lineItems.length, 'items:', lineItems.slice(0, 3))

    const retryHandler = new RetryHandler()
    
    try {
      const instacartData = await retryHandler.executeWithRetry(async () => {
        const apiUrl = `${INSTACART_BASE_URL}/idp/v1/products/products_link`
        
        const requestPayload = {
          title: 'ChefsCart Meal Plan',
          line_items: lineItems,
          link_type: 'shopping_list',
          expires_in: 30, // 30 days
          instructions: [
            'Prepared by ChefsCart. Check your email for your meal plan and links to cooking instructions.'
          ]
        }
        
        console.log('Request payload:', JSON.stringify(requestPayload, null, 2))
        
        const instacartResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${INSTACART_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestPayload)
        })

        if (!instacartResponse.ok) {
          const errorText = await instacartResponse.text()
          console.error('Instacart API error:', {
            status: instacartResponse.status,
            statusText: instacartResponse.statusText,
            headers: Object.fromEntries(instacartResponse.headers.entries()),
            body: errorText
          })
          const error: any = new Error(`Instacart API error: ${instacartResponse.status} - ${errorText}`)
          error.status = instacartResponse.status
          throw error
        }

        return await instacartResponse.json()
      })
      console.log('Shopping list created successfully!', {
        url: instacartData.products_link_url,
        response: instacartData
      })

      const cartUrl = instacartData.products_link_url
      
      // Send email if email is provided
      if (email && mealPlanData?.mealPlan && consolidatedCart.length > 0) {
        try {
          const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/send-meal-plan-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              cartUrl,
              mealPlan: mealPlanData.mealPlan,
              consolidatedCart,
              userPreferences: { ...userPreferences, zipCode }
            })
          })

          if (!emailResponse.ok) {
            console.error('Failed to send email:', await emailResponse.text())
            // Don't fail the cart creation if email fails
          } else {
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError)
          // Don't fail the cart creation if email fails
        }
      }

      return NextResponse.json({
        success: true,
        cartUrl,
        cartId: instacartData.id || `instacart_${planId}_${Date.now()}`,
        message: 'Shopping list created successfully on Instacart'
      })

    } catch (error) {
      console.error('Error calling Instacart API:', error)
      
      // Fallback to search URL with all ingredients after retry failures
      const allIngredients = consolidatedCart
        .map(item => (item.shoppableName || item.name))
        .join(' ')
      
      const fallbackUrl = `https://www.instacart.com/store/search?k=${encodeURIComponent(allIngredients)}`
      
      // Send email even for fallback URL
      if (email && mealPlanData?.mealPlan && consolidatedCart.length > 0) {
        try {
          const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/send-meal-plan-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              cartUrl: fallbackUrl,
              mealPlan: mealPlanData.mealPlan,
              consolidatedCart,
              userPreferences: { ...userPreferences, zipCode }
            })
          })

          if (!emailResponse.ok) {
            console.error('Failed to send fallback email:', await emailResponse.text())
          } else {
          }
        } catch (emailError) {
          console.error('Error sending fallback email:', emailError)
        }
      }
      
      return NextResponse.json({
        success: true,
        cartUrl: fallbackUrl,
        cartId: `fallback_${planId}_${Date.now()}`,
        message: 'Created fallback search URL (API temporarily unavailable)'
      })
    }

  } catch (error) {
    console.error('Error creating cart:', error)
    return NextResponse.json({
      error: 'Failed to create cart',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}