// Core flow types and interfaces

export interface FlowResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retryable?: boolean;
}

export interface ZipValidationResult {
  supported: boolean;
  zipCode: string;
  city?: string;
  state?: string;
  instacartAvailable: boolean;
}

export interface InstacartList {
  id: string;
  items: InstacartItem[];
  deepLink: string;
  totalCost: number;
  matchRate: number;
}

export interface InstacartItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  matched: boolean;
  originalIngredient: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface MealPlanEmail {
  planId: string;
  userEmail: string;
  deepLink: string;
  mealPlan: any; // Will be typed from core-ai
}

export type FlowStep = 
  | 'zip-validation'
  | 'preference-gathering'
  | 'meal-generation'
  | 'plan-review'
  | 'instacart-creation'
  | 'email-delivery';

export interface FlowState {
  currentStep: FlowStep;
  userId?: string;
  sessionId: string;
  data: Record<string, any>;
  errors: string[];
  retryCount: number;
}