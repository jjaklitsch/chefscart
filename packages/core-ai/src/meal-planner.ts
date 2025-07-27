import { createOpenAIClient } from './client';
import type { MealPlan, UserPreferences, Meal } from './types';

export async function generateMealPlan(
  preferences: UserPreferences,
  apiKey?: string
): Promise<MealPlan> {
  if (!apiKey) {
    // Return mock data for development
    return getMockMealPlan(preferences);
  }
  
  const client = createOpenAIClient(apiKey);
  
  // This would contain the actual OpenAI integration
  // For now, return mock data
  return getMockMealPlan(preferences);
}

function getMockMealPlan(preferences: UserPreferences): MealPlan {
  const mockMeals: Meal[] = [
    {
      id: '1',
      name: 'Mediterranean Chicken Bowl',
      description: 'Grilled chicken with quinoa, roasted vegetables, and tzatziki',
      type: 'dinner',
      cookTime: 30,
      difficulty: 'medium',
      cost: 12.50,
      macros: {
        calories: 520,
        protein: 35,
        carbs: 45,
        fat: 18,
        fiber: 8
      },
      ingredients: [
        { id: '1', name: 'Chicken breast', amount: '1', unit: 'lb', category: 'protein' },
        { id: '2', name: 'Quinoa', amount: '1', unit: 'cup', category: 'grains' },
        { id: '3', name: 'Bell peppers', amount: '2', unit: 'pieces', category: 'vegetables' },
      ],
      instructions: [
        'Preheat oven to 400°F',
        'Season chicken and grill for 6-8 minutes per side',
        'Cook quinoa according to package directions',
        'Roast vegetables for 20 minutes',
        'Serve in bowls with tzatziki'
      ]
    }
  ];
  
  return {
    id: 'mock-plan-1',
    meals: mockMeals,
    totalCost: mockMeals.reduce((sum, meal) => sum + meal.cost, 0),
    macros: {
      calories: mockMeals.reduce((sum, meal) => sum + meal.macros.calories, 0),
      protein: mockMeals.reduce((sum, meal) => sum + meal.macros.protein, 0),
      carbs: mockMeals.reduce((sum, meal) => sum + meal.macros.carbs, 0),
      fat: mockMeals.reduce((sum, meal) => sum + meal.macros.fat, 0),
      fiber: mockMeals.reduce((sum, meal) => sum + meal.macros.fiber, 0),
    },
    weekHash: `${preferences.zipCode}-${Date.now()}`
  };
}