import { createOpenAIClient } from './client';
import type { PantryDetection } from './types';

export async function visionDetectPantry(
  imageUrl: string,
  apiKey?: string
): Promise<PantryDetection> {
  if (!apiKey) {
    // Return mock data for development
    return getMockPantryDetection();
  }
  
  const client = createOpenAIClient(apiKey);
  
  // This would contain the actual OpenAI vision integration
  // For now, return mock data
  return getMockPantryDetection();
}

function getMockPantryDetection(): PantryDetection {
  return {
    items: [
      'Flour',
      'Sugar', 
      'Olive oil',
      'Salt',
      'Black pepper',
      'Garlic powder',
      'Onions',
      'Canned tomatoes',
      'Rice',
      'Pasta'
    ],
    confidence: 0.85,
    categories: {
      'Baking': ['Flour', 'Sugar'],
      'Oils & Condiments': ['Olive oil', 'Salt', 'Black pepper', 'Garlic powder'],
      'Vegetables': ['Onions', 'Canned tomatoes'],
      'Grains': ['Rice', 'Pasta']
    }
  };
}