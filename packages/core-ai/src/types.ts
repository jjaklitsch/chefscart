// Core AI types and interfaces

export interface MealPlan {
  id: string;
  meals: Meal[];
  totalCost: number;
  macros: MacroNutrients;
  weekHash: string;
}

export interface Meal {
  id: string;
  name: string;
  description: string;
  type: MealType;
  cookTime: number;
  difficulty: Difficulty;
  cost: number;
  macros: MacroNutrients;
  ingredients: Ingredient[];
  instructions: string[];
  imageUrl?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  category: string;
}

export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface UserPreferences {
  zipCode: string;
  mealsPerWeek: number;
  peoplePerMeal: number;
  dietTypes: DietType[];
  allergies: string[];
  avoidList: string[];
  mealTypes: MealType[];
  maxCookTime: number;
  difficulty: Difficulty;
  cuisines: string[];
  budget: BudgetLevel;
  pantryItems?: string[];
  inspirationKeywords?: string[];
}

export interface PantryDetection {
  items: string[];
  confidence: number;
  categories: Record<string, string[]>;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
export type DietType = 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'gluten-free' | 'dairy-free';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type BudgetLevel = 'budget' | 'moderate' | 'premium';