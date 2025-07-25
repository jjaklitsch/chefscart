import { Request, Response } from 'firebase-functions'
import { getFirestore } from 'firebase-admin/firestore'

const db = getFirestore()

interface CreateListRequest {
  planId: string
  userId: string
}

interface InstacartProduct {
  name: string
  quantity: string
  unit: string
}

export async function createInstacartList(req: Request, res: Response) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { planId, userId }: CreateListRequest = req.body

    if (!planId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    console.log('Creating Instacart list for plan:', planId)

    // Get meal plan from Firestore
    const planDoc = await db.collection('mealPlans').doc(planId).get()
    if (!planDoc.exists) {
      return res.status(404).json({ error: 'Meal plan not found' })
    }

    const mealPlan = planDoc.data()
    if (!mealPlan || mealPlan.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Consolidate ingredients from all recipes
    const consolidatedIngredients = consolidateIngredients(mealPlan.recipes)
    
    console.log('Consolidated ingredients:', consolidatedIngredients)

    // For MVP, create a mock Instacart integration
    // In production, this would call the actual Instacart IDP API
    const instacartResponse = await createMockInstacartList(consolidatedIngredients)
    
    if (!instacartResponse.success) {
      return res.status(500).json({ 
        error: 'Failed to create Instacart list',
        details: instacartResponse.error 
      })
    }

    // Calculate ingredient match percentage
    const ingredientMatchPct = calculateMatchPercentage(
      consolidatedIngredients,
      instacartResponse.matchedItems || []
    )

    // Update meal plan with match percentage
    await planDoc.ref.update({
      ingredientMatchPct,
      status: 'cart_linked',
      updatedAt: new Date()
    })

    // Save Instacart list data
    const instacartList = {
      planId,
      userId,
      shoppingListURL: instacartResponse.cartUrl,
      oosItems: instacartResponse.outOfStockItems || [],
      matchedItems: instacartResponse.matchedItems || [],
      totalItems: consolidatedIngredients.length,
      createdAt: new Date()
    }

    const listDoc = await db.collection('instacartLists').add(instacartList)

    console.log('Instacart list created with ID:', listDoc.id)

    return res.status(200).json({
      success: true,
      listId: listDoc.id,
      cartUrl: instacartResponse.cartUrl,
      ingredientMatchPct,
      totalItems: consolidatedIngredients.length,
      matchedItems: (instacartResponse.matchedItems || []).length,
      outOfStockItems: instacartResponse.outOfStockItems || []
    })

  } catch (error) {
    console.error('Error creating Instacart list:', error)
    return res.status(500).json({ 
      error: 'Failed to create Instacart list',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function consolidateIngredients(recipes: any[]): InstacartProduct[] {
  const ingredientMap = new Map<string, { amount: number; unit: string; category: string }>()

  recipes.forEach(recipe => {
    if (recipe.ingredients) {
      recipe.ingredients.forEach((ingredient: any) => {
        const key = ingredient.name.toLowerCase()
        const existing = ingredientMap.get(key)
        
        if (existing && existing.unit === ingredient.unit) {
          // Sum quantities if units match
          existing.amount += ingredient.amount
        } else {
          // Add new ingredient or different unit
          ingredientMap.set(key, {
            amount: ingredient.amount,
            unit: ingredient.unit,
            category: ingredient.category || 'other'
          })
        }
      })
    }
  })

  // Convert map to array
  return Array.from(ingredientMap.entries()).map(([name, details]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    quantity: details.amount.toString(),
    unit: details.unit
  }))
}

async function createMockInstacartList(ingredients: InstacartProduct[]) {
  // Mock implementation for demonstration
  // In production, this would call the actual Instacart IDP API:
  // POST https://connect.instacart.com/v2/fulfillment/products/products_link
  
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock response - simulate 90%+ match rate
    const totalItems = ingredients.length
    const matchedCount = Math.floor(totalItems * 0.92) // 92% match rate
    const matchedItems = ingredients.slice(0, matchedCount)
    const outOfStockItems = ingredients.slice(matchedCount).map(item => item.name)

    // Generate mock cart URL
    const cartId = generateCartId()
    const cartUrl = `https://www.instacart.com/store/checkout?cart_id=${cartId}&partner=chefscart`

    console.log(`Mock Instacart API: ${matchedCount}/${totalItems} items matched`)

    return {
      success: true,
      cartUrl,
      matchedItems,
      outOfStockItems,
      totalCost: calculateMockTotalCost(matchedItems)
    }

  } catch (error) {
    console.error('Mock Instacart API error:', error)
    return {
      success: false,
      error: 'Failed to create cart'
    }
  }
}

function calculateMatchPercentage(allIngredients: InstacartProduct[], matchedItems: InstacartProduct[]): number {
  if (allIngredients.length === 0) return 100
  return Math.round((matchedItems.length / allIngredients.length) * 100)
}

function generateCartId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function calculateMockTotalCost(items: InstacartProduct[]): number {
  // Mock cost calculation - roughly $3-8 per item
  return items.reduce((total, item) => {
    const itemCost = Math.random() * 5 + 3 // $3-8 range
    return total + itemCost
  }, 0)
}