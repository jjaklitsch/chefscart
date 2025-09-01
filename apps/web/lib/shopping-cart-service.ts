/**
 * ChefsCart Shopping Cart Service
 * 
 * Handles aggregating ingredients across multiple meals and converting them
 * into realistic shopping quantities using the new normalized ingredient schema.
 */

import { getSupabaseClient } from './supabase';

// Type definitions matching our new Instacart-compatible schema
interface MealIngredient {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  health_filters: string[];
  brand_filters: string[];
}

interface MealIngredients {
  ingredients: MealIngredient[];
  servings?: number;
}

interface AggregatedIngredient {
  name: string;
  category: IngredientCategory;
  total_recipe_quantity: number;
  recipe_unit: string;
  suggested_purchase_quantity: number;
  suggested_purchase_unit: string;
  health_filters: string[];
  brand_filters: string[];
  source_meals: string[];
}

type IngredientCategory = 
  | 'Meat & Poultry' 
  | 'Seafood' 
  | 'Dairy & Eggs'
  | 'Fresh Herbs' 
  | 'Produce'
  | 'Rice & Grains' 
  | 'Pasta' 
  | 'Nuts & Seeds'
  | 'Spices, Seasonings, & Oils'
  | 'Condiments & Sauces'
  | 'Canned Goods' 
  | 'Frozen' 
  | 'Baking & Pantry Staples' 
  | 'Bakery & Bread'
  | 'International' 
  | 'Gourmet';

// Category-specific purchasing rules
const PURCHASING_RULES: Record<IngredientCategory, {
  buying_unit: string;
  min_purchase?: number;
  conversion: (recipeAmount: number, recipeUnit: string) => { quantity: number; unit: string; };
}> = {
  'Spices, Seasonings, & Oils': {
    buying_unit: 'bottle',
    conversion: (amount, unit) => {
      // For oils: bottles (16 fl oz = ~32 tbsp), for spices: 1 jar typically sufficient
      let tablespoons = convertToTablespoons(amount, unit);
      if (tablespoons > 8) { // Likely oil
        const bottlesNeeded = Math.ceil(tablespoons / 32);
        return { quantity: Math.max(1, bottlesNeeded), unit: 'bottle' };
      } else { // Likely spice/seasoning
        return { quantity: 1, unit: 'jar' };
      }
    }
  },
  'Condiments & Sauces': {
    buying_unit: 'bottle',
    conversion: (amount, unit) => {
      // Condiments and sauces typically come in bottles/jars
      return { quantity: 1, unit: 'bottle' };
    }
  },
  'Rice & Grains': {
    buying_unit: 'bag',
    conversion: (amount, unit) => {
      let cups = convertToCups(amount, unit);
      // ~2.5 cups per lb for most grains
      const lbsNeeded = cups / 2.5;
      if (lbsNeeded <= 1) return { quantity: 1, unit: '1 lb bag' };
      if (lbsNeeded <= 2) return { quantity: 1, unit: '2 lb bag' };
      return { quantity: 1, unit: '5 lb bag' };
    }
  },
  'Pasta': {
    buying_unit: 'box',
    conversion: (amount, unit) => {
      let ounces = convertToOunces(amount, unit);
      // 1 box = 16 oz typically
      const boxesNeeded = Math.ceil(ounces / 16);
      return { quantity: boxesNeeded, unit: 'box' };
    }
  },
  'Meat & Poultry': {
    buying_unit: 'lb',
    min_purchase: 1,
    conversion: (amount, unit) => {
      let pounds = convertToPounds(amount, unit);
      return { quantity: Math.max(1, Math.ceil(pounds)), unit: 'lb' };
    }
  },
  'Seafood': {
    buying_unit: 'lb',
    min_purchase: 0.5,
    conversion: (amount, unit) => {
      let pounds = convertToPounds(amount, unit);
      return { quantity: Math.max(0.5, Math.round(pounds * 2) / 2), unit: 'lb' };
    }
  },
  'Produce': {
    buying_unit: 'count',
    conversion: (amount, unit) => {
      const count = Math.ceil(amount);
      if (count <= 1) return { quantity: 1, unit: 'piece' };
      if (count <= 3) return { quantity: count, unit: 'pieces' };
      if (count <= 8) return { quantity: 1, unit: 'bag' };
      return { quantity: 1, unit: 'large bag' };
    }
  },
  'Fresh Herbs': {
    buying_unit: 'bunch',
    conversion: () => ({ quantity: 1, unit: 'bunch' })
  },
  'Dairy & Eggs': {
    buying_unit: 'package',
    conversion: () => ({ quantity: 1, unit: 'package' })
  },
  'Canned Goods': {
    buying_unit: 'can',
    conversion: (amount, unit) => {
      // Most canned items are 14.5-15 oz
      if (unit.toLowerCase().includes('can')) {
        return { quantity: Math.ceil(amount), unit: 'can' };
      }
      let ounces = convertToOunces(amount, unit);
      const cansNeeded = Math.ceil(ounces / 14.5);
      return { quantity: cansNeeded, unit: 'can' };
    }
  },
  'Frozen': {
    buying_unit: 'bag',
    conversion: () => ({ quantity: 1, unit: 'bag' })
  },
  'Baking & Pantry Staples': {
    buying_unit: 'bag',
    conversion: (amount, unit) => {
      let pounds = convertToPounds(amount, unit);
      if (pounds <= 2) return { quantity: 1, unit: '2 lb bag' };
      return { quantity: 1, unit: '5 lb bag' };
    }
  },
  'Bakery & Bread': {
    buying_unit: 'loaf',
    conversion: () => ({ quantity: 1, unit: 'loaf' })
  },
  'International': {
    buying_unit: 'package',
    conversion: () => ({ quantity: 1, unit: 'package' })
  },
  'Gourmet': {
    buying_unit: 'package',
    conversion: () => ({ quantity: 1, unit: 'package' })
  },
  'Nuts & Seeds': {
    buying_unit: 'bag',
    conversion: () => ({ quantity: 1, unit: 'bag' })
  }
};

// Unit conversion utilities
function convertToTablespoons(amount: number, unit: string): number {
  const conversions: Record<string, number> = {
    'tbsp': 1, 'tablespoon': 1, 'tablespoons': 1,
    'tsp': 1/3, 'teaspoon': 1/3, 'teaspoons': 1/3,
    'cup': 16, 'cups': 16,
    'fl oz': 2, 'fluid ounce': 2, 'fluid ounces': 2,
    'ml': 1/14.79,
  };
  return amount * (conversions[unit.toLowerCase()] || 1);
}

function convertToCups(amount: number, unit: string): number {
  const conversions: Record<string, number> = {
    'cup': 1, 'cups': 1,
    'tbsp': 1/16, 'tablespoon': 1/16, 'tablespoons': 1/16,
    'tsp': 1/48, 'teaspoon': 1/48, 'teaspoons': 1/48,
    'oz': 1/8, 'ounce': 1/8, 'ounces': 1/8,
    'lb': 2.5, 'pound': 2.5, 'pounds': 2.5, // approximate for grains
  };
  return amount * (conversions[unit.toLowerCase()] || 1);
}

function convertToOunces(amount: number, unit: string): number {
  const conversions: Record<string, number> = {
    'oz': 1, 'ounce': 1, 'ounces': 1,
    'lb': 16, 'pound': 16, 'pounds': 16,
    'g': 1/28.35, 'gram': 1/28.35, 'grams': 1/28.35,
    'kg': 35.27, 'kilogram': 35.27, 'kilograms': 35.27,
  };
  return amount * (conversions[unit.toLowerCase()] || 1);
}

function convertToPounds(amount: number, unit: string): number {
  const conversions: Record<string, number> = {
    'lb': 1, 'pound': 1, 'pounds': 1,
    'oz': 1/16, 'ounce': 1/16, 'ounces': 1/16,
    'g': 1/453.59, 'gram': 1/453.59, 'grams': 1/453.59,
    'kg': 2.205, 'kilogram': 2.205, 'kilograms': 2.205,
  };
  return amount * (conversions[unit.toLowerCase()] || 1);
}

export class ShoppingCartService {
  private supabase;

  constructor() {
    this.supabase = getSupabaseClient();
  }


  /**
   * Aggregate ingredients from multiple meals into a shopping list
   */
  async generateShoppingList(mealSelections: Array<{
    mealId: string;
    targetServings: number;
  }>): Promise<AggregatedIngredient[]> {

    // Fetch meal ingredients
    const mealIds = mealSelections.map(sel => sel.mealId);
    const { data: meals, error } = await this.supabase
      .from('meals')
      .select('id, title, ingredients_json')
      .in('id', mealIds)
      .not('ingredients_json', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch meals: ${error.message}`);
    }

    // Create lookup for target servings
    const servingLookup = mealSelections.reduce((acc, sel) => {
      acc[sel.mealId] = sel.targetServings;
      return acc;
    }, {} as Record<string, number>);

    // Aggregate ingredients by name + unit
    const aggregatedMap = new Map<string, {
      name: string;
      category: IngredientCategory;
      total_quantity: number;
      unit: string;
      health_filters: string[];
      brand_filters: string[];
      source_meals: string[];
    }>();

    for (const meal of meals as any[]) {
      const mealIngredients = meal.ingredients_json as MealIngredients;
      const targetServings = servingLookup[meal.id];
      const originalServings = mealIngredients.servings || 4;

      if (!mealIngredients?.ingredients) {
        console.warn(`⚠️ No ingredients found for meal: ${meal.title}`);
        continue;
      }

      for (const ingredient of mealIngredients.ingredients) {
        const scaledQuantity = ingredient.quantity * (targetServings || 1);
        const aggregationKey = `${ingredient.name}::${ingredient.unit}`;

        if (aggregatedMap.has(aggregationKey)) {
          const existing = aggregatedMap.get(aggregationKey)!;
          existing.total_quantity += scaledQuantity;
          existing.source_meals.push(meal.title);
          // Merge health and brand filters
          existing.health_filters = Array.from(new Set([...existing.health_filters, ...ingredient.health_filters]));
          existing.brand_filters = Array.from(new Set([...existing.brand_filters, ...ingredient.brand_filters]));
        } else {
          aggregatedMap.set(aggregationKey, {
            name: ingredient.name,
            category: ingredient.category,
            total_quantity: scaledQuantity,
            unit: ingredient.unit,
            health_filters: [...ingredient.health_filters],
            brand_filters: [...ingredient.brand_filters],
            source_meals: [meal.title]
          });
        }
      }
    }


    // Convert to shopping quantities
    const shoppingList: AggregatedIngredient[] = [];

    for (const aggregated of Array.from(aggregatedMap.values())) {
      // Apply purchasing rules for this category
      const purchasingRule = PURCHASING_RULES[aggregated.category];
      const purchaseAmount = purchasingRule.conversion(aggregated.total_quantity, aggregated.unit);

      shoppingList.push({
        name: aggregated.name,
        category: aggregated.category,
        total_recipe_quantity: aggregated.total_quantity,
        recipe_unit: aggregated.unit,
        suggested_purchase_quantity: purchaseAmount.quantity,
        suggested_purchase_unit: purchaseAmount.unit,
        health_filters: aggregated.health_filters,
        brand_filters: aggregated.brand_filters,
        source_meals: Array.from(new Set(aggregated.source_meals)) // Remove duplicates
      });
    }

    // Sort by category for better shopping experience
    const categoryOrder: IngredientCategory[] = [
      'Produce', 'Fresh Herbs',
      'Meat & Poultry', 'Seafood', 'Dairy & Eggs',
      'Canned Goods', 'Frozen',
      'Rice & Grains', 'Pasta', 'Baking & Pantry Staples',
      'Spices, Seasonings, & Oils', 'Condiments & Sauces',
      'Nuts & Seeds', 'Bakery & Bread', 'International', 'Gourmet'
    ];

    shoppingList.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.name.localeCompare(b.name);
    });

    return shoppingList;
  }

  /**
   * Group shopping list by store sections for easier shopping
   */
  groupByStoreSection(shoppingList: AggregatedIngredient[]): Record<string, AggregatedIngredient[]> {
    const sectionMap: Record<IngredientCategory, string> = {
      'Produce': 'Produce',
      'Fresh Herbs': 'Produce',
      'Meat & Poultry': 'Meat & Seafood',
      'Seafood': 'Meat & Seafood',
      'Dairy & Eggs': 'Dairy & Eggs',
      'Frozen': 'Frozen',
      'Canned Goods': 'Pantry',
      'Rice & Grains': 'Pantry',
      'Pasta': 'Pantry',
      'Baking & Pantry Staples': 'Pantry',
      'Spices, Seasonings, & Oils': 'Pantry',
      'Condiments & Sauces': 'Pantry',
      'Nuts & Seeds': 'Pantry',
      'Bakery & Bread': 'Pantry',
      'International': 'Pantry',
      'Gourmet': 'Pantry'
    };

    return shoppingList.reduce((grouped, item) => {
      const section = sectionMap[item.category] || 'Other';
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(item);
      return grouped;
    }, {} as Record<string, AggregatedIngredient[]>);
  }

  /**
   * Get summary statistics for the shopping list
   */
  getShoppingListStats(shoppingList: AggregatedIngredient[]): {
    totalItems: number;
    uniqueMeals: number;
    byCategory: Record<IngredientCategory, number>;
  } {
    const allMeals = new Set<string>();
    const categoryStats: Record<IngredientCategory, number> = {} as any;

    for (const item of shoppingList) {
      item.source_meals.forEach(meal => allMeals.add(meal));
      categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
    }

    return {
      totalItems: shoppingList.length,
      uniqueMeals: allMeals.size,
      byCategory: categoryStats
    };
  }
}

// Export types for use in other modules
export type {
  MealIngredient,
  MealIngredients,
  AggregatedIngredient,
  IngredientCategory
};