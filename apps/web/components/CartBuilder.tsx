"use client"

import { useState, useEffect, useCallback } from 'react'
import { ShoppingCart, Plus, Minus, X, ChevronRight, ArrowLeft, AlertCircle, ChevronDown } from 'lucide-react'
import { Recipe, UserPreferences } from '../types'

interface CartBuilderProps {
  recipes: Recipe[]
  pantryItems: string[]
  preferences?: UserPreferences
  onProceedToCheckout: (finalCart: ConsolidatedIngredient[]) => void
  onBack: () => void
}

// Enhanced ingredient structure from database
interface ShoppableIngredient {
  display_name: string
  shoppable_name: string
  quantity: number
  unit: string
  category: string
  scale_type: 'linear' | 'fixed' | 'sqrt'
  optional: boolean
  notes?: string
}

interface MealIngredientBreakdown {
  mealTitle: string
  originalServings: number
  targetServings: number
  scaledQuantity: number
  originalQuantity: number
}

interface ConsolidatedIngredient {
  name: string
  shoppableName: string
  amount: number
  unit: string
  category: string
  fromRecipes: string[]
  mealBreakdown: MealIngredientBreakdown[]
  isPantryItem?: boolean
  userAdded?: boolean
  shoppingQuantity: number
  shoppingUnit: string
  notes?: string | undefined
  isStrikethrough?: boolean
}

// Unit classification for intelligent conversion
const RECIPE_UNITS = new Set(['cups', 'cup', 'tbsp', 'tablespoon', 'tsp', 'teaspoon', 'fl oz', 'fluid oz', 'pint', 'quart', 'gallon'])
const PURCHASE_UNITS = new Set(['lbs', 'lb', 'oz', 'kg', 'g', 'can', 'jar', 'bottle', 'bag', 'box', 'package', 'bunch', 'head', 'clove', 'slice'])
const COUNT_UNITS = new Set(['piece', 'pieces', 'each', 'whole'])

// Function to convert recipe units to appropriate purchase units
function convertRecipeUnitToPurchaseUnit(amount: number, unit: string, itemName: string): { amount: number; unit: string } {
  const lowerUnit = unit.toLowerCase()
  const lowerItem = itemName.toLowerCase()
  
  if (!RECIPE_UNITS.has(lowerUnit)) {
    // Already a purchase unit or count unit, keep as is
    return { amount, unit }
  }
  
  // Convert recipe units to purchase units based on item type
  
  // Dry goods (buy in bags/boxes)
  if (lowerItem.includes('rice') || lowerItem.includes('flour') || lowerItem.includes('sugar') || 
      lowerItem.includes('pasta') || lowerItem.includes('cereal') || lowerItem.includes('oats') ||
      lowerItem.includes('quinoa') || lowerItem.includes('barley') || lowerItem.includes('lentil')) {
    return { amount: 1, unit: 'bag' }
  }
  
  // Liquids (buy in bottles/cartons)
  if (lowerItem.includes('oil') || lowerItem.includes('vinegar') || lowerItem.includes('sauce') ||
      lowerItem.includes('dressing') || lowerItem.includes('syrup')) {
    return { amount: 1, unit: 'bottle' }
  }
  
  // Dairy (buy in cartons/containers)
  if (lowerItem.includes('milk') || lowerItem.includes('cream') || lowerItem.includes('yogurt') ||
      lowerItem.includes('butter')) {
    if (lowerUnit.includes('cup') && amount >= 2) {
      return { amount: 1, unit: 'half-gallon' }
    }
    return { amount: 1, unit: 'container' }
  }
  
  // Spices/herbs (buy in small containers)
  if (lowerUnit.includes('tsp') || lowerUnit.includes('tbsp')) {
    return { amount: 1, unit: 'container' }
  }
  
  // Default: convert to weight or container
  if (amount >= 2 && (lowerUnit.includes('cup') || lowerUnit.includes('pint'))) {
    return { amount: Math.ceil(amount / 4), unit: 'lbs' } // Rough conversion
  }
  
  return { amount: 1, unit: 'container' }
}

// Function to parse grocery list items with quantities
function parseGroceryItem(line: string): { name: string; amount: number; unit: string } {
  const trimmedLine = line.trim()
  if (!trimmedLine) return { name: '', amount: 1, unit: '' }

  // Remove common list formatting (bullets, numbers, dashes)
  const cleanLine = trimmedLine.replace(/^[-•*\d+\.\)]\s*/, '').trim()
  
  let amount = 1
  let unit = ''
  let name = cleanLine

  // First try to match number + unit + name (e.g., "2 lbs chicken")
  let match = cleanLine.match(/^(\d+(?:\.\d+)?)\s+([a-zA-Z]+)\s+(.+)$/)
  
  if (match) {
    // Has unit: "2 lbs chicken"
    amount = parseFloat(match[1] || '1')
    const potentialUnit = match[2] || ''
    name = match[3] || cleanLine
    
    // All recognized units (recipe + purchase + count)
    const allUnits = [...Array.from(RECIPE_UNITS), ...Array.from(PURCHASE_UNITS), ...Array.from(COUNT_UNITS)]
    if (allUnits.includes(potentialUnit.toLowerCase())) {
      unit = potentialUnit
    } else {
      // If it's not a recognized unit, treat it as part of the name
      name = `${potentialUnit} ${name}`
    }
  } else {
    // Try to match number + name (e.g., "6 bananas")
    match = cleanLine.match(/^(\d+(?:\.\d+)?)\s+(.+)$/)
    if (match) {
      amount = parseFloat(match[1] || '1')
      name = match[2] || cleanLine
      unit = ''
    }
  }

  // Capitalize first letter of name
  name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()

  // Convert recipe units to purchase units if needed
  if (unit) {
    const converted = convertRecipeUnitToPurchaseUnit(amount, unit, name)
    amount = converted.amount
    unit = converted.unit
  }

  // If no unit specified, infer appropriate purchase unit
  if (!unit) {
    unit = getRecommendedUnit(name)
  }

  return { name, amount, unit }
}

// Function to intelligently suggest unit based on item name
function getRecommendedUnit(itemName: string): string {
  const name = itemName.toLowerCase()
  
  // Deli/meat items - by pound
  if (name.includes('deli') || name.includes('sliced') || name.includes('cold cut') ||
      name.includes('turkey breast') || name.includes('ham') || name.includes('salami') ||
      name.includes('pastrami') || name.includes('prosciutto') || name.includes('roast beef')) {
    return 'lbs'
  }
  
  // Fish/seafood - by pound
  if (name.includes('salmon') || name.includes('tuna') || name.includes('cod') || 
      name.includes('shrimp') || name.includes('crab') || name.includes('lobster')) {
    return 'lbs' 
  }
  
  // Meat - by pound
  if (name.includes('ground beef') || name.includes('ground turkey') || name.includes('steak') ||
      name.includes('pork chop') || name.includes('chicken breast') || name.includes('chicken thigh')) {
    return 'lbs'
  }
  
  // Produce items that are typically weighed
  if (name.includes('banana') || name.includes('apple') || name.includes('orange') ||
      name.includes('grape') || name.includes('cherry') || name.includes('berry')) {
    return 'lbs'
  }
  
  // Bulk vegetables
  if (name.includes('potato') || name.includes('onion') || name.includes('carrot') || 
      name.includes('sweet potato')) {
    return 'lbs'
  }
  
  // Only suggest weight-based units for items typically sold by weight  
  // Other items default to pieces (quantity=1)
  
  // Default to pieces/items
  return 'pieces'
}

// Common units of measure for grocery items (currently used for validation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COMMON_UNITS = [
  // Count-based
  { value: 'pieces', label: 'pieces', category: 'Count' },
  { value: 'items', label: 'items', category: 'Count' },
  { value: 'each', label: 'each', category: 'Count' },
  
  // Weight-based  
  { value: 'lbs', label: 'pounds (lbs)', category: 'Weight' },
  { value: 'oz', label: 'ounces (oz)', category: 'Weight' },
  { value: 'kg', label: 'kilograms (kg)', category: 'Weight' },
  { value: 'g', label: 'grams (g)', category: 'Weight' },
  
  // Volume-based
  { value: 'cups', label: 'cups', category: 'Volume' },
  { value: 'tbsp', label: 'tablespoons', category: 'Volume' },
  { value: 'tsp', label: 'teaspoons', category: 'Volume' },
  { value: 'fl oz', label: 'fluid ounces', category: 'Volume' },
  { value: 'ml', label: 'milliliters (ml)', category: 'Volume' },
  { value: 'liters', label: 'liters', category: 'Volume' },
  
  // Package-based
  { value: 'packages', label: 'packages', category: 'Packaging' },
  { value: 'boxes', label: 'boxes', category: 'Packaging' },
  { value: 'cans', label: 'cans', category: 'Packaging' },
  { value: 'bottles', label: 'bottles', category: 'Packaging' },
  { value: 'jars', label: 'jars', category: 'Packaging' },
  { value: 'bags', label: 'bags', category: 'Packaging' },
  { value: 'containers', label: 'containers', category: 'Packaging' },
]

// Normalize category names to prevent duplicates and ensure proper capitalization
function normalizeCategory(category: string): string {
  const normalized = category.toLowerCase().trim()
  
  // Handle common category variations
  const categoryMappings: Record<string, string> = {
    'condiment': 'Condiments',
    'condiments': 'Condiments',
    'dairy': 'Dairy',
    'meat': 'Meat & Poultry',
    'meats': 'Meat & Poultry',
    'poultry': 'Meat & Poultry',
    'protein': 'Meat & Poultry',
    'proteins': 'Meat & Poultry',
    'vegetable': 'Vegetables',
    'vegetables': 'Vegetables',
    'veggies': 'Vegetables',
    'fruit': 'Fruits',
    'fruits': 'Fruits',
    'grain': 'Grains & Pasta',
    'grains': 'Grains & Pasta',
    'pasta': 'Grains & Pasta',
    'rice': 'Grains & Pasta',
    'bread': 'Bakery',
    'bakery': 'Bakery',
    'spice': 'Spices & Herbs',
    'spices': 'Spices & Herbs',
    'herb': 'Spices & Herbs',
    'herbs': 'Spices & Herbs',
    'seasoning': 'Spices & Herbs',
    'seasonings': 'Spices & Herbs',
    'oil': 'Oils & Vinegars',
    'oils': 'Oils & Vinegars',
    'vinegar': 'Oils & Vinegars',
    'vinegars': 'Oils & Vinegars',
    'frozen': 'Frozen',
    'canned': 'Canned Goods',
    'can': 'Canned Goods',
    'pantry': 'Pantry',
    'snack': 'Snacks',
    'snacks': 'Snacks'
  }
  
  return categoryMappings[normalized] || category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
}

// Determine if an item should be sold by weight
function isWeightBasedItem(name: string, category: string): boolean {
  const lowerName = name.toLowerCase();
  const lowerCategory = category.toLowerCase();
  
  // Weight-based categories
  if (lowerCategory.includes('meat') || lowerCategory.includes('poultry') || lowerCategory.includes('seafood')) {
    return true;
  }
  
  // Some produce items sold by weight
  if (lowerCategory.includes('produce')) {
    const weightBasedProduce = ['potato', 'onion', 'carrot', 'apple', 'banana', 'orange', 
                               'grape', 'cherry', 'berry', 'tomato', 'pepper', 'cucumber'];
    return weightBasedProduce.some(item => lowerName.includes(item));
  }
  
  return false;
}

// Convert recipe units to purchasable store units
function convertToPurchasableUnits(name: string, amount: number, unit: string, category: string = ''): { name: string; amount: number; unit: string } {
  const lowerName = name.toLowerCase();
  const unitLower = unit.toLowerCase();
  
  // Skip water entirely
  if (lowerName === 'water' || lowerName.includes('water')) {
    return { name: '', amount: 0, unit: '' };
  }
  
  const isWeightBased = isWeightBasedItem(name, category);
  
  // For small quantities (spices, herbs, condiments), default to 1 item
  if (unitLower.includes('tsp') || unitLower.includes('tbsp') || unitLower.includes('teaspoon') || unitLower.includes('tablespoon')) {
    return { name, amount: 1, unit: isWeightBased ? 'lb' : '' };
  }
  
  // Weight-based items keep their weight units
  if (isWeightBased) {
    if (unitLower.includes('oz') || unitLower.includes('ounce')) {
      const pounds = amount >= 16 ? Math.round((amount / 16) * 4) / 4 : Math.round(amount * 4) / 4; // Round to quarter pounds/ounces
      const finalUnit = amount >= 16 ? 'lb' : 'oz';
      return { name, amount: pounds >= 16 ? pounds / 16 : pounds, unit: finalUnit };
    }
    if (unitLower.includes('lb') || unitLower.includes('pound')) {
      return { name, amount: Math.round(amount * 4) / 4, unit: 'lb' }; // Round to quarter pounds
    }
    // Default to 1 lb for weight-based items without clear weight
    return { name, amount: 1, unit: 'lb' };
  }
  
  // For everything else, convert to whole quantities without units (except weight-based)
  let finalAmount = Math.ceil(amount);
  
  // Special handling for very small amounts - default to 1
  if (finalAmount < 1) {
    finalAmount = 1;
  }
  
  return { name, amount: finalAmount, unit: '' };
}

export default function CartBuilder({ recipes, pantryItems, preferences, onProceedToCheckout, onBack }: CartBuilderProps) {
  const [consolidatedIngredients, setConsolidatedIngredients] = useState<ConsolidatedIngredient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('items')
  const [bulkItems, setBulkItems] = useState('')
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [excludedItems, setExcludedItems] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Filter out unwanted items like water and ice cubes
  const shouldFilterItem = (name: string): boolean => {
    const lowerName = name.toLowerCase()
    return lowerName.includes('water') || 
           lowerName.includes('ice cube') || 
           lowerName.includes('ice cubes') ||
           lowerName === 'water' ||
           lowerName === 'ice'
  }

  // Check if ingredient supports organic options and apply organic preference
  const applyOrganicPreference = (shoppableName: string, ingredient: ShoppableIngredient): string => {
    // Only apply organic if user has organic preference set
    if (!preferences?.organicPreference || preferences.organicPreference === 'no') {
      return shoppableName
    }

    // List of ingredients that commonly support organic options
    const organicSupportedIngredients = [
      // Produce
      'apple', 'apples', 'banana', 'bananas', 'carrot', 'carrots', 'onion', 'onions',
      'tomato', 'tomatoes', 'potato', 'potatoes', 'spinach', 'kale', 'lettuce',
      'broccoli', 'bell pepper', 'bell peppers', 'cucumber', 'celery', 'avocado',
      'lemon', 'lime', 'orange', 'strawberries', 'blueberries', 'mushrooms',
      'garlic', 'ginger', 'herbs', 'cilantro', 'parsley', 'basil', 'rosemary',
      
      // Grains and legumes
      'rice', 'quinoa', 'oats', 'flour', 'bread', 'pasta', 'beans', 'lentils',
      'chickpeas', 'black beans', 'kidney beans',
      
      // Dairy and eggs
      'milk', 'eggs', 'cheese', 'yogurt', 'butter', 'cream',
      
      // Meat and poultry
      'chicken', 'beef', 'pork', 'turkey', 'ground beef', 'chicken breast',
      
      // Pantry items
      'olive oil', 'coconut oil', 'honey', 'maple syrup', 'vinegar',
      'soy sauce', 'tomato sauce', 'canned tomatoes'
    ]

    const lowerShoppableName = shoppableName.toLowerCase()
    const lowerDisplayName = ingredient.display_name.toLowerCase()
    
    // Check if this ingredient supports organic
    const supportsOrganic = organicSupportedIngredients.some(organic => 
      lowerShoppableName.includes(organic) || lowerDisplayName.includes(organic)
    )

    // If ingredient supports organic and user wants organic, add "Organic" prefix
    if (supportsOrganic && preferences.organicPreference === 'yes') {
      // Avoid double "Organic" prefix
      if (!shoppableName.toLowerCase().startsWith('organic')) {
        return `Organic ${shoppableName}`
      }
    }

    return shoppableName
  }

  // Consolidate ingredients on mount
  useEffect(() => {
    const loadIngredients = () => {
      setIsLoading(true)
      try {
        consolidateIngredientsDirectly()
      } catch (error) {
        console.error('Error consolidating ingredients:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadIngredients()
  }, [recipes, pantryItems])

  // Scale ingredient quantity based on serving size and scale type
  const scaleIngredientQuantity = (ingredient: ShoppableIngredient, originalServings: number, targetServings: number): number => {
    const multiplier = targetServings / originalServings
    
    switch (ingredient.scale_type) {
      case 'linear':
        return ingredient.quantity * multiplier
      case 'fixed':
        return ingredient.quantity // Don't scale (salt, spices)
      case 'sqrt':
        return ingredient.quantity * Math.sqrt(multiplier) // Some seasonings scale slower
      default:
        return ingredient.quantity * multiplier
    }
  }

  // Convert scaled quantities to shopping units with better precision
  const convertToShoppingUnits = (ingredient: ShoppableIngredient, scaledQuantity: number): { quantity: number; unit: string } => {
    const result = convertToPurchasableUnits(ingredient.shoppable_name || ingredient.display_name, scaledQuantity, ingredient.unit, ingredient.category);
    
    // Fix floating point precision issues
    let quantity = result.amount;
    if (quantity % 1 !== 0) {
      // If it has decimals, round to 2 decimal places to avoid long floating point numbers
      quantity = Math.round(quantity * 100) / 100;
    }
    
    return { 
      quantity: quantity,
      unit: result.unit
    };
  }

  const consolidateIngredientsDirectly = () => {
    const shoppableMap = new Map<string, ConsolidatedIngredient>()
    
    recipes.forEach(recipe => {
      // Get ingredients from ingredients_json (new structure) or fallback to ingredients
      const ingredients: ShoppableIngredient[] = (recipe as Recipe & { ingredients_json?: { ingredients: ShoppableIngredient[], servings: number } }).ingredients_json?.ingredients || 
        recipe.ingredients?.map(ing => ({
          display_name: ing.name,
          shoppable_name: ing.name, // Fallback only - real data has proper shoppable_name
          quantity: ing.amount,
          unit: ing.unit,
          category: ing.category || 'other',
          scale_type: 'linear' as const,
          optional: false
        })) || []
      
      // Debug: Check which data source we're using
      const recipeWithMeta = recipe as Recipe & { ingredients_json?: { ingredients: ShoppableIngredient[], servings: number } }
      if (recipe.title === recipes[0]?.title) {
        console.log('Data source check:', {
          'has ingredients_json?': !!recipeWithMeta.ingredients_json,
          'using fallback?': !recipeWithMeta.ingredients_json?.ingredients,
          'ingredient count': ingredients.length,
          'sample raw ingredient': recipeWithMeta.ingredients_json?.ingredients?.[0]
        })
      }
      
      const originalServings = recipeWithMeta.ingredients_json?.servings || recipe.servings || 2
      // IMPORTANT: Use user's selected serving size from onboarding, not recipe default
      // This ensures ingredients are scaled to what the user actually wants to cook
      const targetServings = preferences?.peoplePerMeal || 2
      
      // Debug log to verify scaling is working correctly
      if (recipe.title === recipes[0]?.title) {
        console.log(`Ingredient scaling for "${recipe.title}":`, {
          originalServings,
          targetServings,
          scalingFactor: targetServings / originalServings,
          userPreference: preferences?.peoplePerMeal
        })
      }
      
      ingredients.forEach(ingredient => {
        if (shouldFilterItem(ingredient.display_name)) return
        
        // Debug log to check ingredient structure
        if (recipe.title === recipes[0]?.title && ingredients.indexOf(ingredient) === 0) {
          console.log('First ingredient of first recipe:', {
            display_name: ingredient.display_name,
            shoppable_name: ingredient.shoppable_name,
            'has shoppable_name?': !!ingredient.shoppable_name
          })
        }
        
        const scaledQuantity = scaleIngredientQuantity(ingredient, originalServings, targetServings)
        const shopping = convertToShoppingUnits(ingredient, scaledQuantity)
        
        // Use shoppable_name + category as key for consolidation
        const consolidationKey = `${(ingredient.shoppable_name || ingredient.display_name || 'unknown').toLowerCase()}_${ingredient.category}`
        
        if (shoppableMap.has(consolidationKey)) {
          // Add to existing ingredient
          const existing = shoppableMap.get(consolidationKey)!
          existing.amount += scaledQuantity
          existing.shoppingQuantity += shopping.quantity
          existing.fromRecipes.push(recipe.title)
          existing.mealBreakdown.push({
            mealTitle: recipe.title,
            originalServings,
            targetServings,
            scaledQuantity,
            originalQuantity: ingredient.quantity
          })
        } else {
          // Create new consolidated ingredient with organic preference applied
          const baseShoppableName = ingredient.shoppable_name || ingredient.display_name
          const organicShoppableName = applyOrganicPreference(baseShoppableName, ingredient)
          
          shoppableMap.set(consolidationKey, {
            name: ingredient.display_name,
            shoppableName: organicShoppableName,
            amount: scaledQuantity,
            unit: ingredient.unit,
            category: normalizeCategory(ingredient.category),
            fromRecipes: [recipe.title],
            mealBreakdown: [{
              mealTitle: recipe.title,
              originalServings,
              targetServings,
              scaledQuantity,
              originalQuantity: ingredient.quantity
            }],
            shoppingQuantity: shopping.quantity,
            shoppingUnit: shopping.unit
            // Note: Removed notes display as requested
          })
        }
      })
    })
    
    // Mark pantry items
    pantryItems.forEach(pantryItem => {
      const itemLower = pantryItem.toLowerCase().trim()
      shoppableMap.forEach(ingredient => {
        if (ingredient.shoppableName.toLowerCase().includes(itemLower) || 
            ingredient.name.toLowerCase().includes(itemLower)) {
          ingredient.isPantryItem = true
        }
      })
    })
    
    // Convert to array and sort by category
    const consolidated = Array.from(shoppableMap.values()).sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      return a.shoppableName.localeCompare(b.shoppableName)
    })
    
    console.log('Sample ingredient:', consolidated[0] ? {
      name: consolidated[0].name,
      shoppableName: consolidated[0].shoppableName,
      'Are they different?': consolidated[0].name !== consolidated[0].shoppableName
    } : 'No ingredients')
    setConsolidatedIngredients(consolidated)
  }

  const handleAddItem = () => {
    if (newItemName && newItemAmount && newItemUnit) {
      const itemName = newItemName.trim()
      const amount = parseFloat(newItemAmount)
      
      // Check for existing ingredient with same name and unit
      const existingIndex = consolidatedIngredients.findIndex(ing => 
        ing.shoppableName.toLowerCase() === itemName.toLowerCase() && ing.unit === newItemUnit
      )
      
      if (existingIndex >= 0) {
        // Update existing ingredient
        setConsolidatedIngredients(prev => 
          prev.map((ing, index) => 
            index === existingIndex 
              ? { ...ing, amount: ing.amount + amount, fromRecipes: [...ing.fromRecipes, 'User Added'] }
              : ing
          )
        )
      } else {
        // Add new ingredient
        const newIngredient: ConsolidatedIngredient = {
          name: itemName,
          shoppableName: itemName,
          amount: amount,
          unit: newItemUnit,
          category: normalizeCategory('Other'),
          fromRecipes: ['User Added'],
          mealBreakdown: [],
          shoppingQuantity: amount,
          shoppingUnit: newItemUnit,
          userAdded: true
        }
        setConsolidatedIngredients([...consolidatedIngredients, newIngredient])
      }
      
      setNewItemName('')
      setNewItemAmount('')
      // Keep form open and unit as 'items' for easier multiple additions
    }
  }

  const handleAddBulkItems = () => {
    if (!bulkItems.trim()) return

    const lines = bulkItems.trim().split('\n').filter(line => line.trim())
    const newIngredients: ConsolidatedIngredient[] = []

    lines.forEach(line => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      const parsed = parseGroceryItem(trimmedLine)
      if (!parsed.name) return

      newIngredients.push({
        name: parsed.name,
        shoppableName: parsed.name,
        amount: parsed.amount,
        unit: parsed.unit || getRecommendedUnit(parsed.name),
        category: normalizeCategory('Other'),
        fromRecipes: ['User Added'],
        mealBreakdown: [],
        shoppingQuantity: parsed.amount,
        shoppingUnit: parsed.unit || getRecommendedUnit(parsed.name),
        userAdded: true
      })
    })

    if (newIngredients.length > 0) {
      setConsolidatedIngredients([...consolidatedIngredients, ...newIngredients])
      setBulkItems('')
      setShowAddItem(false)
    }
  }

  const toggleStrikethrough = (ingredientName: string) => {
    setConsolidatedIngredients(prev => 
      prev.map(ing => {
        if (ing.shoppableName === ingredientName) {
          return { ...ing, isStrikethrough: !ing.isStrikethrough }
        }
        return ing
      })
    )
  }


  const removeItem = (ingredientName: string) => {
    setConsolidatedIngredients(prev => prev.filter(ing => ing.shoppableName !== ingredientName))
  }

  const toggleExpandedItem = (ingredientName: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ingredientName)) {
        newSet.delete(ingredientName)
      } else {
        newSet.add(ingredientName)
      }
      return newSet
    })
  }

  const getFinalCart = () => {
    return consolidatedIngredients.filter(ing => 
      !ing.isStrikethrough && ing.shoppingQuantity > 0
    )
  }

  // Common pantry items that users often already have
  const getCommonPantryItems = () => {
    const pantryItems = ['Flour', 'Sugar', 'Salt', 'Black Pepper', 'Olive Oil', 
                        'Vegetable Oil', 'Rice', 'Pasta', 'Oats']
    
    return consolidatedIngredients.filter(ing => 
      pantryItems.some(pantry => ing.shoppableName.toLowerCase().includes(pantry.toLowerCase()))
    )
  }


  const handleContinueClick = () => {
    onProceedToCheckout(getFinalCart())
  }


  // Group ingredients with custom items at top, then by category
  const groupedIngredients = (() => {
    const customItems = consolidatedIngredients.filter(ing => ing.userAdded)
    const recipeIngredients = consolidatedIngredients.filter(ing => !ing.userAdded)

    const groups: Record<string, ConsolidatedIngredient[]> = {}
    
    // Add custom items section if there are any
    if (customItems.length > 0) {
      groups['Custom Items'] = customItems
    }

    // Group recipe ingredients by category
    recipeIngredients.forEach(ingredient => {
      const category = ingredient.category || 'Other'
      if (!groups[category]) groups[category] = []
      groups[category].push(ingredient)
    })

    return groups
  })()

  const totalItems = getFinalCart().length
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 pb-32">
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
        
        {/* Back button */}
        <div className="mb-4 md:mb-6">
          <button
            onClick={onBack}
            className="flex items-center justify-start px-3 md:px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm md:text-base text-left"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meal Plan
          </button>
        </div>

        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Build Your Shopping Cart</h1>
          <p className="text-gray-600 text-sm sm:text-base mt-1">Review and customize your grocery list before checkout</p>
        </div>

        {/* Summary Stats - Mobile Optimized */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <p className="text-xs sm:text-sm text-gray-500 uppercase font-medium">
                {isLoading ? 'Processing ingredients...' : 'Total Items Ready for Instacart'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {isLoading ? '...' : totalItems}
                </p>
              </div>
              {!isLoading && (
                <p className="text-xs text-gray-400 mt-1">
                  From {recipes.length} meals • {consolidatedIngredients.filter(ing => ing.mealBreakdown.length > 1).length} shared ingredients
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm text-blue-800 font-medium">Customize your shopping cart</p>
              <p className="text-xs sm:text-sm text-blue-600 mt-1">
                Already have this item at home? Tap the "×" to remove it from your cart.
              </p>
            </div>
          </div>
        </div>

        {/* Add Item Button */}
        {!showAddItem && !isLoading && (
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setShowAddItem(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Custom Item
            </button>
          </div>
        )}

        {/* Add Item Form */}
        {showAddItem && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Add Custom Items</h3>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setAddMode('single')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    addMode === 'single' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Single Item
                </button>
                <button
                  onClick={() => setAddMode('bulk')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    addMode === 'bulk' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Bulk Add
                </button>
              </div>
            </div>

            {addMode === 'single' ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Item name"
                  value={newItemName}
                  onChange={(e) => {
                    const itemName = e.target.value
                    setNewItemName(itemName)
                    // Auto-suggest unit based on item name if unit is still default
                    if (itemName && newItemUnit === 'items') {
                      const recommendedUnit = getRecommendedUnit(itemName)
                      if (recommendedUnit === 'lbs') {
                        setNewItemUnit('lbs')
                      }
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent md:col-span-2"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <select
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                >
                  <option value="items">items</option>
                  <option value="lbs">pounds (lbs)</option>
                  <option value="oz">ounces (oz)</option>
                  <option value="bottles">bottles</option>
                  <option value="cans">cans</option>
                  <option value="boxes">boxes</option>
                </select>
              </div>
            ) : (
              <div>
                <textarea
                  placeholder="Paste your shopping list here, one item per line with quantity:
6 bananas
2 lbs chicken breast
olive oil
salt
3 apples"
                  value={bulkItems}
                  onChange={(e) => setBulkItems(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: &quot;5 bananas&quot;, &quot;2 lbs chicken&quot;, &quot;olive oil&quot;
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={addMode === 'single' ? handleAddItem : handleAddBulkItems}
                disabled={addMode === 'single' ? !newItemName || !newItemAmount : !bulkItems.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {addMode === 'single' ? 'Add Item' : 'Add Items'}
              </button>
              {addMode === 'single' && (
                <button
                  onClick={() => {
                    setShowAddItem(false)
                    setNewItemName('')
                    setNewItemAmount('')
                    setNewItemUnit('items')
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Done Adding
                </button>
              )}
              <button
                onClick={() => {
                  setShowAddItem(false)
                  setNewItemName('')
                  setNewItemAmount('')
                  setNewItemUnit('items')
                  setBulkItems('')
                  setAddMode('single')
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Ingredient Categories */}
        {isLoading ? (
          <div className="space-y-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mr-3"></div>
                <div className="text-gray-600">
                  <p className="font-medium">Organizing your shopping list...</p>
                  <p className="text-sm text-gray-500 mt-1">Consolidating ingredients across meals and scaling quantities</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 mb-8">
            {Object.entries(groupedIngredients).map(([category, ingredients]) => (
              <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{category}</h3>
                  {category === 'Custom Items' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Items you added to your list
                    </p>
                  )}
                </div>
                <div className="divide-y divide-gray-200">
                  {ingredients.map(ingredient => {
                    const isMultiMeal = !ingredient.userAdded && ingredient.mealBreakdown.length > 0
                    const isExpanded = expandedItems.has(ingredient.shoppableName)
                    
                    return (
                      <div 
                        key={ingredient.shoppableName} 
                        className={`${ingredient.isStrikethrough ? 'opacity-50' : ''}`}
                      >
                        {/* Main ingredient row */}
                        <div 
                          className={`p-4 sm:p-6 ${isMultiMeal ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                          onClick={() => isMultiMeal && toggleExpandedItem(ingredient.shoppableName)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {/* Item name and quantity */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                                <h4 className={`font-medium text-gray-900 text-base sm:text-lg ${ingredient.isStrikethrough ? 'line-through' : ''}`}>
                                  {ingredient.shoppableName}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600 mt-1 sm:mt-0">
                                    {Math.round(ingredient.amount * 100) / 100} {ingredient.unit}
                                  </span>
                                  {/* Show chevron for multi-meal items */}
                                  {isMultiMeal && (
                                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  )}
                                </div>
                              </div>
                              
                              {/* Only show status badges (not meal count) */}
                              {(ingredient.isPantryItem || ingredient.userAdded) && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {ingredient.isPantryItem && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      In Pantry
                                    </span>
                                  )}
                                  {ingredient.userAdded && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                      Custom
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Action buttons */}
                            <div className="flex items-start gap-2 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation() // Prevent row expansion
                                  toggleStrikethrough(ingredient.shoppableName)
                                }}
                                className={`p-2 rounded-full transition-colors touch-manipulation ${
                                  ingredient.isStrikethrough 
                                    ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' 
                                    : 'text-red-600 hover:bg-red-50'
                                }`}
                                title={ingredient.isStrikethrough ? 'Add back to cart' : 'Remove from cart'}
                              >
                                <X className="h-4 w-4" />
                              </button>
                              
                              {ingredient.userAdded && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation() // Prevent row expansion
                                    removeItem(ingredient.shoppableName)
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors touch-manipulation"
                                  title="Delete item permanently"
                                >
                                  <X className="h-4 w-4" strokeWidth={3} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded meal breakdown */}
                        {isMultiMeal && isExpanded && (
                          <div className="px-4 sm:px-6 pb-4 bg-gray-50">
                            <div className="text-sm text-gray-700">
                              <p className="font-medium text-gray-900 mb-2">Used in:</p>
                              <div className="space-y-2">
                                {ingredient.mealBreakdown.map((breakdown, index) => (
                                  <div key={index} className="flex justify-between">
                                    <span>{breakdown.mealTitle}</span>
                                    <span className="text-gray-500">
                                      {Math.round(breakdown.scaledQuantity * 100) / 100} {ingredient.unit}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Note */}
        {!isLoading && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-8">
            <p className="text-sm text-amber-800">
              <strong>Smart Shopping List:</strong> We&apos;ve consolidated ingredients across your selected meals and scaled quantities to match your serving preferences. 
              Items are organized by category. Cross out items you don&apos;t need, but they&apos;ll stay visible for reference.
            </p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-3 sm:p-4 safe-area-padding-bottom">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleContinueClick}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-6 py-3 sm:py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl text-base sm:text-lg touch-manipulation"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                <span className="hidden sm:inline">Continue to Instacart ({totalItems} items)</span>
                <span className="sm:hidden">Continue ({totalItems} items)</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  )
}