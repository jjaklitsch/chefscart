import { createServerAdminClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

interface IngredientWithScaling {
  name: string;
  shopping_quantity: number;
  shopping_unit: string;
  cooking_quantity: number;
  cooking_unit: string;
  category: string;
  organic_supported: boolean;
  scales_with_servings: boolean;
  brand_filters: string[];
  // Scaled amounts for display
  scaled_cooking_quantity: number;
  scaled_shopping_quantity: number;
}

interface EnhancedInstructionStep {
  step: number;
  instruction: string;
  time_minutes: number;
  dynamic_ingredients: string[];
  // Processed instruction with scaled amounts
  processed_instruction: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedServings = parseInt(searchParams.get('servings') || '0');
    
    const supabase = createServerAdminClient();
    
    // Fetch all meals and find by slug matching (since meals table doesn't have slug column)
    const { data: allMeals, error } = await supabase
      .from('meals')
      .select('*');

    if (error) {
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (!allMeals) {
      return NextResponse.json(
        { error: 'No meals found' },
        { status: 404 }
      );
    }

    // Find meal by generating slug from title
    const meal = allMeals.find(meal => {
      const mealSlug = meal.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return mealSlug === params.slug;
    });

    if (!meal) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      );
    }

    // Use requested servings or default to meal's default
    const targetServings = requestedServings > 0 ? requestedServings : meal.servings_default;
    const scalingFactor = targetServings / meal.servings_default;

    // Return ingredients with base quantities (frontend will handle scaling)
    const ingredients: IngredientWithScaling[] = meal.ingredients_json?.map((ingredient: any) => ({
      ...ingredient,
      // Keep base quantities from database for frontend scaling
      base_cooking_quantity: ingredient.cooking_quantity,
      base_shopping_quantity: ingredient.shopping_quantity,
      // Also include scaled quantities for shopping cart API compatibility
      scaled_cooking_quantity: ingredient.scales_with_servings 
        ? ingredient.cooking_quantity * scalingFactor
        : ingredient.cooking_quantity,
      scaled_shopping_quantity: calculateShoppingQuantity(
        ingredient.shopping_quantity,
        ingredient.shopping_unit,
        scalingFactor,
        ingredient.scales_with_servings
      )
    })) || [];

    // Return instructions with original placeholders (frontend will handle dynamic processing)
    const instructionSteps = meal.instructions_json?.steps?.map((step: any) => ({
      ...step,
      // Keep original instruction with placeholders for frontend processing
      instruction: step.instruction,
      dynamic_ingredients: step.dynamic_ingredients || []
    })) || [];

    // Calculate scaled timing
    const scaledTiming = {
      prep_time: meal.instructions_json?.prep_time || 0,
      cook_time: meal.instructions_json?.cook_time || 0,
      total_time: meal.instructions_json?.total_time || 0
    };

    // Return enhanced meal data with scaling
    const response = {
      ...meal,
      scaled_servings: targetServings,
      scaling_factor: scalingFactor,
      ingredients: ingredients,
      instructions: {
        ...scaledTiming,
        steps: instructionSteps
      },
      serving_options: {
        min: meal.servings_min,
        max: meal.servings_max,
        default: meal.servings_default,
        current: targetServings
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate smart shopping quantities
function calculateShoppingQuantity(
  originalQuantity: number,
  unit: string,
  scalingFactor: number,
  scalesWithServings: boolean
): number {
  if (!scalesWithServings) {
    return originalQuantity;
  }

  const scaledAmount = originalQuantity * scalingFactor;

  // Smart packaging logic
  switch (unit.toLowerCase()) {
    case 'package':
    case 'can':
    case 'bottle':
      // Round up to next whole package
      return Math.ceil(scaledAmount);
      
    case 'each':
    case 'head':
    case 'bunch':
      // Round to nearest whole item
      return Math.round(scaledAmount);
      
    case 'pounds':
    case 'ounces':
      // Round to reasonable increments
      if (scaledAmount < 1) return Math.round(scaledAmount * 4) / 4; // Quarter increments
      return Math.round(scaledAmount * 2) / 2; // Half increments
      
    default:
      return Math.round(scaledAmount * 10) / 10; // One decimal place
  }
}

