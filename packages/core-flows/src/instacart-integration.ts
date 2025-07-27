import type { FlowResult, InstacartList, InstacartItem } from './types';

export async function createInstacartList(
  ingredients: Array<{ name: string; amount: string; unit: string }>,
  apiKey?: string
): Promise<FlowResult<InstacartList>> {
  try {
    if (!apiKey) {
      // Return mock data for development
      return {
        success: true,
        data: getMockInstacartList(ingredients)
      };
    }
    
    // This would contain the actual Instacart API integration
    // For now, return mock data
    return {
      success: true,
      data: getMockInstacartList(ingredients)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Instacart list',
      retryable: true
    };
  }
}

function getMockInstacartList(ingredients: Array<{ name: string; amount: string; unit: string }>): InstacartList {
  const mockItems: InstacartItem[] = ingredients.map((ingredient, index) => ({
    id: `item-${index}`,
    name: ingredient.name,
    quantity: parseFloat(ingredient.amount) || 1,
    unit: ingredient.unit,
    price: Math.random() * 10 + 2, // Random price between $2-12
    matched: Math.random() > 0.1, // 90% match rate
    originalIngredient: ingredient.name
  }));
  
  return {
    id: `instacart-list-${Date.now()}`,
    items: mockItems,
    deepLink: `https://instacart.com/cart/mock-${Date.now()}`,
    totalCost: mockItems.reduce((sum, item) => sum + item.price, 0),
    matchRate: mockItems.filter(item => item.matched).length / mockItems.length
  };
}