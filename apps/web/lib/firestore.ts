import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore'
import { db } from './firebase'
import { UserPreferences, MealPlan } from '../types'

export interface UserData {
  id: string
  email: string
  zipCode: string
  preferences: UserPreferences
  createdAt: Timestamp
  lastActiveAt: Timestamp
}

export interface SavedMealPlan {
  id: string
  userId: string
  mealPlan: MealPlan
  shoppingList: any[]
  email: string
  zipCode: string
  createdAt: Timestamp
  status: 'generated' | 'cart_created' | 'completed'
}

export const FirestoreService = {
  async createUser(email: string, zipCode: string, preferences: UserPreferences): Promise<string> {
    try {
      const userDoc = await addDoc(collection(db, 'users'), {
        email,
        zipCode,
        preferences,
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      })
      
      console.log('User created with ID:', userDoc.id)
      return userDoc.id
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  },

  async getUserByEmail(email: string): Promise<UserData | null> {
    try {
      // For now, we'll create new users each time since we don't have proper auth
      // In a production app, this would query by email
      return null
    } catch (error) {
      console.error('Error getting user by email:', error)
      return null
    }
  },

  async saveMealPlan(
    userId: string, 
    email: string,
    zipCode: string,
    mealPlan: MealPlan, 
    shoppingList: any[]
  ): Promise<string> {
    try {
      const mealPlanDoc = await addDoc(collection(db, 'mealPlans'), {
        userId,
        email,
        zipCode,
        mealPlan: {
          id: mealPlan.id,
          userId: mealPlan.userId,
          recipes: mealPlan.recipes.map(recipe => ({
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            cuisine: recipe.cuisine,
            difficulty: recipe.difficulty,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            servings: recipe.servings,
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || [],
            imageUrl: recipe.imageUrl,
            tags: recipe.tags || []
          }))
        },
        shoppingList: shoppingList.map(item => ({
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          category: item.category,
          fromRecipes: item.fromRecipes,
          isPantryItem: item.isPantryItem || false,
          userAdded: item.userAdded || false
        })),
        createdAt: serverTimestamp(),
        status: 'cart_created'
      })

      console.log('Meal plan saved with ID:', mealPlanDoc.id)
      return mealPlanDoc.id
    } catch (error) {
      console.error('Error saving meal plan:', error)
      throw error
    }
  },

  async updateMealPlanStatus(mealPlanId: string, status: 'generated' | 'cart_created' | 'completed'): Promise<void> {
    try {
      const mealPlanRef = doc(db, 'mealPlans', mealPlanId)
      await setDoc(mealPlanRef, { 
        status,
        lastUpdatedAt: serverTimestamp()
      }, { merge: true })
      
      console.log('Meal plan status updated:', status)
    } catch (error) {
      console.error('Error updating meal plan status:', error)
      throw error
    }
  }
}