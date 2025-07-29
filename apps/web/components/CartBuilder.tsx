"use client"

import { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Minus, X, ChevronRight, ArrowLeft, AlertCircle } from 'lucide-react'
import { Recipe, Ingredient } from '../types'

interface CartBuilderProps {
  recipes: Recipe[]
  pantryItems: string[]
  onProceedToCheckout: (finalCart: ConsolidatedIngredient[]) => void
  onBack: () => void
}

interface ConsolidatedIngredient {
  name: string
  amount: number
  unit: string
  category?: string
  fromRecipes: string[]
  isPantryItem?: boolean
  userAdded?: boolean
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
  
  // Liquids - by volume
  if (name.includes('milk') || name.includes('juice') || name.includes('oil') ||
      name.includes('vinegar') || name.includes('sauce') || name.includes('broth')) {
    return 'bottles'
  }
  
  // Canned goods
  if (name.includes('canned') || name.includes('tomato paste') || name.includes('beans') ||
      name.includes('corn') || name.includes('peas')) {
    return 'cans'
  }
  
  // Boxed items
  if (name.includes('cereal') || name.includes('pasta') || name.includes('rice') ||
      name.includes('crackers') || name.includes('tea')) {
    return 'boxes'
  }
  
  // Default to pieces/items
  return 'pieces'
}

// Common units of measure for grocery items
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

// Convert recipe units to purchasable store units with 10% buffer
function convertToPurchasableUnits(name: string, amount: number, unit: string): { name: string; amount: number; unit: string } {
  const lowerName = name.toLowerCase()
  const unitLower = unit.toLowerCase()
  
  // Skip water entirely
  if (lowerName === 'water' || lowerName.includes('water')) {
    return { name: '', amount: 0, unit: '' }
  }
  
  // Capitalize first letter consistently
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  
  // Apply 10% buffer first
  const bufferedAmount = amount * 1.1
  
  // Define weight-based items (meat, fish, cold cuts)
  const isWeightBased = lowerName.includes('chicken') || lowerName.includes('beef') || 
                       lowerName.includes('pork') || lowerName.includes('lamb') ||
                       lowerName.includes('fish') || lowerName.includes('salmon') ||
                       lowerName.includes('tuna') || lowerName.includes('steak') ||
                       lowerName.includes('ground') || lowerName.includes('turkey') ||
                       lowerName.includes('ham') || lowerName.includes('bacon') ||
                       lowerName.includes('sausage') || lowerName.includes('cold cuts') ||
                       lowerName.includes('deli meat')
  
  // Enhanced name formatting with sizes where appropriate
  let enhancedName = capitalizedName
  if (lowerName.includes('pasta sauce') || lowerName.includes('tomato sauce')) {
    enhancedName = capitalizedName + ' - 16oz'
  } else if (lowerName.includes('broth') || lowerName.includes('stock')) {
    enhancedName = capitalizedName + ' - 32oz'
  } else if (lowerName.includes('milk')) {
    enhancedName = capitalizedName + ' - 1 gallon'
  } else if (lowerName.includes('yogurt')) {
    enhancedName = capitalizedName + ' - 32oz container'
  }
  
  // Define packaged items that come in specific package sizes
  const isPackagedItem = lowerName.includes('tortilla') || lowerName.includes('wrap') ||
                        lowerName.includes('bread') || lowerName.includes('bagel') ||
                        lowerName.includes('bun') || lowerName.includes('roll') ||
                        lowerName.includes('pita') || lowerName.includes('naan') ||
                        lowerName.includes('taco shell') || lowerName.includes('hot dog')
  
  // Convert cooking measurements to shopping quantities
  if (unitLower.includes('teaspoon') || unitLower.includes('tsp') || 
      unitLower.includes('tablespoon') || unitLower.includes('tbsp')) {
    // Spices, herbs, and seasonings always become 1 container
    if (lowerName.includes('salt') || lowerName.includes('pepper') || lowerName.includes('spice') || 
        lowerName.includes('herbs') || lowerName.includes('seasoning') || lowerName.includes('garlic powder') ||
        lowerName.includes('onion powder') || lowerName.includes('paprika') || lowerName.includes('cumin') ||
        lowerName.includes('oregano') || lowerName.includes('basil') || lowerName.includes('thyme') ||
        lowerName.includes('rosemary') || lowerName.includes('cinnamon') || lowerName.includes('vanilla')) {
      return { name: enhancedName, amount: 1, unit: '' }
    }
    // Oils, vinegars, sauces become bottles
    if (lowerName.includes('oil') || lowerName.includes('vinegar') || lowerName.includes('sauce') ||
        lowerName.includes('honey') || lowerName.includes('maple syrup')) {
      return { name: enhancedName, amount: 1, unit: '' }
    }
    // Other liquid ingredients become bottles/containers
    return { name: enhancedName, amount: 1, unit: '' }
  }
  
  // Convert cups to practical shopping units
  if (unitLower.includes('cup')) {
    if (lowerName.includes('rice') || lowerName.includes('pasta') || lowerName.includes('flour') ||
        lowerName.includes('sugar') || lowerName.includes('oats')) {
      // Dry goods - convert to boxes/bags
      const boxes = Math.ceil(bufferedAmount / 4) // Assume 4 cups per box/bag
      return { name: enhancedName, amount: boxes, unit: '' }
    }
    if (lowerName.includes('broth') || lowerName.includes('stock')) {
      // Liquids - convert to containers
      const containers = Math.ceil(bufferedAmount / 4) // 32oz = 4 cups
      return { name: enhancedName, amount: containers, unit: '' }
    }
    return { name: enhancedName, amount: Math.ceil(bufferedAmount), unit: '' }
  }
  
  // Handle weight-based items with weight labels
  if (unitLower.includes('oz') || unitLower.includes('ounce')) {
    if (isWeightBased) {
      if (bufferedAmount >= 16) {
        const pounds = (bufferedAmount / 16).toFixed(1)
        return { name: enhancedName, amount: parseFloat(pounds), unit: 'lbs' }
      } else {
        return { name: enhancedName, amount: Math.ceil(bufferedAmount), unit: 'oz' }
      }
    }
    // Non-weight items - convert to containers/packages
    return { name: enhancedName, amount: 1, unit: '' }
  }
  
  if (unitLower.includes('lb') || unitLower.includes('pound')) {
    if (isWeightBased) {
      return { name: enhancedName, amount: Math.ceil(bufferedAmount * 10) / 10, unit: 'lbs' } // Round to nearest 0.1 lb
    }
    return { name: enhancedName, amount: Math.ceil(bufferedAmount), unit: '' }
  }
  
  // Handle individual items (fruits, vegetables, etc.)
  if (unitLower.includes('piece') || unitLower.includes('item') || unitLower === '' || unitLower === 'each') {
    // For packaged items, show package info
    if (isPackagedItem) {
      if (lowerName.includes('tortilla') || lowerName.includes('wrap')) {
        const packages = Math.ceil(bufferedAmount / 8) // Assume 8 per package
        return { name: `${enhancedName} (pack of 8)`, amount: packages, unit: '' }
      } else if (lowerName.includes('bread') || lowerName.includes('bagel')) {
        const loaves = Math.ceil(bufferedAmount / 12) // Assume 12 slices/pieces per loaf/bag
        return { name: `${enhancedName} (1 loaf/bag)`, amount: loaves, unit: '' }
      } else if (lowerName.includes('bun') || lowerName.includes('roll')) {
        const packages = Math.ceil(bufferedAmount / 6) // Assume 6 per package
        return { name: `${enhancedName} (pack of 6)`, amount: packages, unit: '' }
      } else if (lowerName.includes('pita') || lowerName.includes('naan')) {
        const packages = Math.ceil(bufferedAmount / 4) // Assume 4 per package
        return { name: `${enhancedName} (pack of 4)`, amount: packages, unit: '' }
      } else if (lowerName.includes('taco shell')) {
        const packages = Math.ceil(bufferedAmount / 12) // Assume 12 per package
        return { name: `${enhancedName} (pack of 12)`, amount: packages, unit: '' }
      }
    }
    
    // For produce items, use smart quantity logic
    if (lowerName.includes('sweet potato') || lowerName.includes('potato')) {
      // Potatoes: assume 1 medium potato per 2 servings, minimum 2
      return { name: enhancedName, amount: Math.max(2, Math.ceil(bufferedAmount * 1.5)), unit: '' }
    } else if (lowerName.includes('onion')) {
      // Onions: typically bought in 3lb bags, assume 1 onion per 4 servings  
      return { name: `${enhancedName} (3 lb bag)`, amount: Math.max(1, Math.ceil(bufferedAmount / 6)), unit: '' }
    } else if (lowerName.includes('carrot')) {
      // Carrots: typically bought in bags
      return { name: `${enhancedName} (2 lb bag)`, amount: Math.max(1, Math.ceil(bufferedAmount / 8)), unit: '' }
    } else if (lowerName.includes('apple') || lowerName.includes('orange') || lowerName.includes('banana')) {
      // Fruit: typically bought in quantities, minimum 3-4
      return { name: enhancedName, amount: Math.max(3, Math.ceil(bufferedAmount * 1.5)), unit: '' }
    } else if (lowerName.includes('bell pepper') || lowerName.includes('pepper')) {
      // Bell peppers: often bought 3-pack
      return { name: `${enhancedName} (3-pack)`, amount: Math.max(1, Math.ceil(bufferedAmount / 3)), unit: '' }
    }
    
    return { name: enhancedName, amount: Math.ceil(bufferedAmount), unit: '' }
  }
  
  // Handle cloves (garlic)
  if (unitLower.includes('clove')) {
    if (bufferedAmount <= 3) {
      return { name: 'Garlic', amount: 1, unit: '' }
    }
    return { name: 'Garlic', amount: Math.ceil(bufferedAmount / 6), unit: '' }
  }
  
  // Default: convert to shopping quantity (usually 1 item/container)
  return { name: enhancedName, amount: 1, unit: '' }
}

export default function CartBuilder({ recipes, pantryItems, onProceedToCheckout, onBack }: CartBuilderProps) {
  const [consolidatedIngredients, setConsolidatedIngredients] = useState<ConsolidatedIngredient[]>([])
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [bulkItems, setBulkItems] = useState('')
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [excludedItems, setExcludedItems] = useState<Set<string>>(new Set())
  const [showUpsellModal, setShowUpsellModal] = useState(false)
  const [costEstimates, setCostEstimates] = useState<Record<string, number>>({})
  const [isEstimatingCosts, setIsEstimatingCosts] = useState(false)
  const [costEstimationError, setCostEstimationError] = useState<string | null>(null)
  const [upsellBulkItems, setUpsellBulkItems] = useState('')

  // AI-based cost estimation function
  const estimateIngredientCosts = async (ingredients: ConsolidatedIngredient[]) => {
    if (ingredients.length === 0) return

    setIsEstimatingCosts(true)
    setCostEstimationError(null)

    try {
      // Get zipCode from localStorage 
      const zipCode = localStorage.getItem('chefscart_zipcode') || ''

      const response = await fetch('/api/estimate-ingredient-costs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: ingredients.map(ing => ({
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit
          })),
          zipCode
        })
      })

      if (!response.ok) {
        throw new Error('Failed to estimate costs')
      }

      const data = await response.json()
      
      if (data.success && data.estimates) {
        const newCostEstimates: Record<string, number> = {}
        data.estimates.forEach((estimate: any) => {
          newCostEstimates[estimate.name] = estimate.estimatedCost
        })
        setCostEstimates(newCostEstimates)
        console.log('✅ Updated cost estimates for', Object.keys(newCostEstimates).length, 'ingredients')
      }
    } catch (error) {
      console.error('Error estimating ingredient costs:', error)
      setCostEstimationError('Unable to estimate costs. Showing approximate pricing.')
    } finally {
      setIsEstimatingCosts(false)
    }
  }

  // Fallback heuristic cost calculation (if AI fails)
  const getHeuristicCost = (ingredient: ConsolidatedIngredient): number => {
    const name = ingredient.name.toLowerCase()
    const amount = ingredient.amount
    
    if (name.includes('meat') || name.includes('chicken') || name.includes('beef')) {
      return amount * 8
    }
    if (name.includes('fish') || name.includes('salmon')) {
      return amount * 12
    }
    if (name.includes('cheese') || name.includes('dairy')) {
      return amount * 4
    }
    return Math.max(1.99, amount * 2) // Default minimum $1.99
  }

  // Get cost for an ingredient (AI-based with fallback)
  const getItemCost = (ingredient: ConsolidatedIngredient): number => {
    const aiCost = costEstimates[ingredient.name]
    return aiCost !== undefined ? aiCost : getHeuristicCost(ingredient)
  }

  // Consolidate ingredients on mount
  useEffect(() => {
    consolidateIngredients()
  }, [recipes, pantryItems])


  const consolidateIngredients = () => {
    const ingredientMap = new Map<string, ConsolidatedIngredient>()
    
    // Process all recipe ingredients
    recipes.forEach(recipe => {
      recipe.ingredients?.forEach(ingredient => {
        const key = ingredient.name.toLowerCase().trim()
        
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!
          // Add amounts if units match, otherwise keep separate entries
          if (existing.unit === ingredient.unit) {
            existing.amount += ingredient.amount
            existing.fromRecipes.push(recipe.title)
          } else {
            // Create a new entry with unit suffix
            const newKey = `${key} (${ingredient.unit})`
            ingredientMap.set(newKey, {
              name: ingredient.name,
              amount: ingredient.amount,
              unit: ingredient.unit,
              category: normalizeCategory(ingredient.category || 'Other'),
              fromRecipes: [recipe.title]
            })
          }
        } else {
          ingredientMap.set(key, {
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            category: normalizeCategory(ingredient.category || 'Other'),
            fromRecipes: [recipe.title]
          })
        }
      })
    })

    // Convert to purchasable units and apply 10% buffer, filter out empty items (like water)
    ingredientMap.forEach((ingredient, key) => {
      const purchasableInfo = convertToPurchasableUnits(ingredient.name, ingredient.amount, ingredient.unit)
      if (purchasableInfo.name === '' || purchasableInfo.amount === 0) {
        // Remove water and other filtered items
        ingredientMap.delete(key)
      } else {
        ingredient.amount = purchasableInfo.amount
        ingredient.unit = purchasableInfo.unit
        ingredient.name = purchasableInfo.name
      }
    })

    // Mark pantry items
    pantryItems.forEach(item => {
      const key = item.toLowerCase().trim()
      if (ingredientMap.has(key)) {
        ingredientMap.get(key)!.isPantryItem = true
      }
    })

    // Convert to array and sort by category
    const consolidated = Array.from(ingredientMap.values()).sort((a, b) => {
      if (a.category === b.category) return a.name.localeCompare(b.name)
      return (a.category || 'Other').localeCompare(b.category || 'Other')
    })

    setConsolidatedIngredients(consolidated)
  }

  const handleAddItem = () => {
    if (newItemName && newItemAmount && newItemUnit) {
      const itemName = newItemName.trim()
      const amount = parseFloat(newItemAmount)
      
      // Check for existing ingredient with same name and unit
      const existingIndex = consolidatedIngredients.findIndex(ing => 
        ing.name.toLowerCase() === itemName.toLowerCase() && ing.unit === newItemUnit
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
          amount: amount,
          unit: newItemUnit,
          category: normalizeCategory('Other'),
          fromRecipes: ['User Added'],
          userAdded: true
        }
        setConsolidatedIngredients([...consolidatedIngredients, newIngredient])
      }
      
      setNewItemName('')
      setNewItemAmount('')
      setNewItemUnit('')
      setShowAddItem(false)
    }
  }

  const handleAddBulkItems = () => {
    if (!bulkItems.trim()) return

    const lines = bulkItems.trim().split('\n').filter(line => line.trim())
    const newIngredients: ConsolidatedIngredient[] = []

    lines.forEach(line => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      // Try to parse different formats:
      // "5 bananas" -> amount: 5, name: bananas, unit: pieces
      // "2 lbs chicken" -> amount: 2, name: chicken, unit: lbs  
      // "olive oil" -> amount: 1, name: olive oil, unit: bottle
      const match = trimmedLine.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)\s+(.+)$/) || 
                   trimmedLine.match(/^(\d+(?:\.\d+)?)\s+(.+)$/)

      let amount = 1
      let unit = 'pieces'
      let name = trimmedLine

      if (match && match[1]) {
        amount = parseFloat(match[1])
        if (match.length === 4) {
          // Has unit: "2 lbs chicken"
          unit = match[2] || 'pieces'
          name = match[3] || trimmedLine
        } else {
          // No unit: "5 bananas"
          name = match[2] || trimmedLine
        }
      }

      newIngredients.push({
        name: name,
        amount: amount,
        unit: unit,
        category: normalizeCategory('Other'),
        fromRecipes: ['User Added'],
        userAdded: true
      })
    })

    if (newIngredients.length > 0) {
      setConsolidatedIngredients([...consolidatedIngredients, ...newIngredients])
      setBulkItems('')
      setShowAddItem(false)
    }
  }

  const toggleExcludeItem = (ingredientName: string) => {
    const newExcluded = new Set(excludedItems)
    if (newExcluded.has(ingredientName)) {
      newExcluded.delete(ingredientName)
    } else {
      newExcluded.add(ingredientName)
    }
    setExcludedItems(newExcluded)
    // Cost calculation will be instant using cached estimates - no API needed
  }

  const updateQuantity = (ingredientName: string, delta: number) => {
    setConsolidatedIngredients(prev => 
      prev.map(ing => {
        if (ing.name === ingredientName) {
          const newAmount = ing.amount + delta
          // Validate quantity: minimum 0, maximum 999 for safety
          const validatedAmount = Math.max(0, Math.min(999, newAmount))
          return { ...ing, amount: validatedAmount }
        }
        return ing
      })
    )
  }

  const removeItem = (ingredientName: string) => {
    setConsolidatedIngredients(prev => prev.filter(ing => ing.name !== ingredientName))
  }

  const getFinalCart = () => {
    return consolidatedIngredients.filter(ing => 
      !excludedItems.has(ing.name) && ing.amount > 0
    )
  }

  // Common grocery items for upsell (filtered by what's not already in cart)
  const getCommonGroceryItems = () => {
    const allItems = ['Milk', 'Eggs', 'Bread', 'Butter', 'Cheese', 'Yogurt', 'Bananas', 
                     'Apples', 'Onions', 'Garlic', 'Potatoes', 'Carrots', 'Tomatoes',
                     'Lettuce', 'Bell peppers', 'Avocados', 'Lemons', 'Limes', 'Oranges',
                     'Coffee', 'Tea', 'Sugar', 'Salt', 'Black pepper', 'Olive oil',
                     'Rice', 'Pasta', 'Flour', 'Oats', 'Cereal', 'Crackers', 'Snacks']
    
    const existingItems = consolidatedIngredients.map(ing => ing.name.toLowerCase())
    return allItems.filter(item => !existingItems.includes(item.toLowerCase()))
  }

  const handleContinueClick = () => {
    setShowUpsellModal(true)
  }

  const handleUpsellComplete = () => {
    setShowUpsellModal(false)
    onProceedToCheckout(getFinalCart())
  }

  const addQuickItem = (itemName: string) => {
    const newIngredient: ConsolidatedIngredient = {
      name: itemName,
      amount: 1,
      unit: '',
      category: normalizeCategory('Other'),
      fromRecipes: ['User Added'],
      userAdded: true
    }
    setConsolidatedIngredients([...consolidatedIngredients, newIngredient])
  }

  const handleUpsellBulkAdd = () => {
    if (!upsellBulkItems.trim()) return

    const lines = upsellBulkItems.trim().split('\n').filter(line => line.trim())
    const newIngredients: ConsolidatedIngredient[] = []

    lines.forEach(line => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      newIngredients.push({
        name: trimmedLine.charAt(0).toUpperCase() + trimmedLine.slice(1).toLowerCase(),
        amount: 1,
        unit: '',
        category: normalizeCategory('Other'),
        fromRecipes: ['User Added'],
        userAdded: true
      })
    })

    if (newIngredients.length > 0) {
      setConsolidatedIngredients([...consolidatedIngredients, ...newIngredients])
      setUpsellBulkItems('')
    }
  }

  const groupedIngredients = consolidatedIngredients.reduce((groups, ingredient) => {
    const category = ingredient.category || 'Other'
    if (!groups[category]) groups[category] = []
    groups[category].push(ingredient)
    return groups
  }, {} as Record<string, ConsolidatedIngredient[]>)

  const totalItems = getFinalCart().length
  
  // Estimate costs only when new ingredients are added, not when items are excluded
  useEffect(() => {
    const finalCart = getFinalCart()
    if (finalCart.length > 0) {
      // Only estimate if we don't have cost estimates for some ingredients
      const needsEstimation = finalCart.some(ing => !(ing.name in costEstimates))
      if (needsEstimation) {
        estimateIngredientCosts(finalCart)
      }
    }
  }, [consolidatedIngredients]) // Removed excludedItems to prevent unnecessary API calls
  
  const totalCost = getFinalCart().reduce((sum, ing) => sum + getItemCost(ing), 0)
  const costRange = {
    low: Math.round(totalCost * 0.8),
    high: Math.round(totalCost * 1.2)
  }

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
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Build Your Shopping Cart</h1>
          <p className="text-gray-600 text-sm md:text-base">Review and customize your grocery list before checkout</p>
        </div>

        {/* Summary Stats - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 mr-2 sm:mr-3" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Total Items</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{totalItems}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-start">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 uppercase">
                  Est. Cost {isEstimatingCosts && '(Updating...)'}
                </p>
                {isEstimatingCosts ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-green-600 mr-2"></div>
                    <p className="text-sm sm:text-lg font-semibold text-gray-600">Calculating...</p>
                  </div>
                ) : (
                  <p className="text-lg sm:text-xl font-bold text-gray-900">${costRange.low}-${costRange.high}</p>
                )}
                {costEstimationError && (
                  <p className="text-xs text-orange-600 mt-1 leading-tight">{costEstimationError}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pantry Items Notice */}
        {pantryItems.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 font-medium">Pantry items identified</p>
                <p className="text-xs text-blue-600 mt-1">
                  Items you already have are marked below. Uncheck them to exclude from your cart.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Add Item Button */}
        {!showAddItem && (
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
                    // Auto-suggest unit based on item name if unit is empty
                    if (itemName && !newItemUnit) {
                      setNewItemUnit(getRecommendedUnit(itemName))
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
                  <option value="">Select unit...</option>
                  <optgroup label="Count">
                    <option value="pieces">pieces</option>
                    <option value="items">items</option>
                    <option value="each">each</option>
                  </optgroup>
                  <optgroup label="Weight">
                    <option value="lbs">pounds (lbs)</option>
                    <option value="oz">ounces (oz)</option>
                    <option value="kg">kilograms (kg)</option>
                    <option value="g">grams (g)</option>
                  </optgroup>
                  <optgroup label="Volume">
                    <option value="cups">cups</option>
                    <option value="tbsp">tablespoons</option>
                    <option value="tsp">teaspoons</option>
                    <option value="fl oz">fluid ounces</option>
                    <option value="ml">milliliters (ml)</option>
                    <option value="liters">liters</option>
                  </optgroup>
                  <optgroup label="Packaging">
                    <option value="packages">packages</option>
                    <option value="boxes">boxes</option>
                    <option value="cans">cans</option>
                    <option value="bottles">bottles</option>
                    <option value="jars">jars</option>
                    <option value="bags">bags</option>
                    <option value="containers">containers</option>
                  </optgroup>
                </select>
              </div>
            ) : (
              <div>
                <textarea
                  placeholder="Paste your shopping list here, one item per line:&#10;5 bananas&#10;2 lbs chicken breast&#10;olive oil&#10;3 cups rice"
                  value={bulkItems}
                  onChange={(e) => setBulkItems(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: "5 bananas", "2 lbs chicken", "olive oil"
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={addMode === 'single' ? handleAddItem : handleAddBulkItems}
                disabled={addMode === 'single' ? !newItemName || !newItemAmount || !newItemUnit : !bulkItems.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {addMode === 'single' ? 'Add Item' : 'Add Items'}
              </button>
              <button
                onClick={() => {
                  setShowAddItem(false)
                  setNewItemName('')
                  setNewItemAmount('')
                  setNewItemUnit('')
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
        <div className="space-y-6 mb-8">
          {Object.entries(groupedIngredients).map(([category, ingredients]) => (
            <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{category}</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {ingredients.map(ingredient => (
                  <div 
                    key={ingredient.name} 
                    className={`p-4 ${excludedItems.has(ingredient.name) ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <input
                          type="checkbox"
                          checked={!excludedItems.has(ingredient.name)}
                          onChange={() => toggleExcludeItem(ingredient.name)}
                          className="h-5 w-5 text-orange-600 rounded focus:ring-orange-500 flex-shrink-0"
                        />
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">
                            {ingredient.name}
                            {ingredient.isPantryItem && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                In Pantry
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            Used in: {ingredient.fromRecipes.join(', ')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-gray-100 rounded-lg">
                          <button
                            onClick={() => updateQuantity(ingredient.name, -1)}
                            className="p-1 hover:bg-gray-200 rounded-l-lg transition-colors"
                            disabled={excludedItems.has(ingredient.name)}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="px-3 py-1 text-sm font-medium">
                            {ingredient.unit ? `${ingredient.amount} ${ingredient.unit}` : ingredient.amount}
                          </span>
                          <button
                            onClick={() => updateQuantity(ingredient.name, 1)}
                            className="p-1 hover:bg-gray-200 rounded-r-lg transition-colors"
                            disabled={excludedItems.has(ingredient.name)}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {ingredient.userAdded && (
                          <button
                            onClick={() => removeItem(ingredient.name)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-8">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> We've added 10% extra to all quantities to ensure you have enough ingredients. 
            Actual prices may vary based on store and brand selection.
          </p>
        </div>
      </div>

      {/* Fixed Bottom Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-3 md:p-4">
        <div className="max-w-4xl mx-auto flex justify-center">
          <button
            onClick={handleContinueClick}
            className="flex items-center justify-center px-6 md:px-8 py-3 md:py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl text-base md:text-lg"
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Continue to Instacart ({totalItems} items)
          </button>
        </div>
      </div>

      {/* Upsell Modal */}
      {showUpsellModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Add Common Grocery Items</h3>
              <p className="text-gray-600 mb-6">Don't forget these common items you might need!</p>
              
              {/* Quick Add Pills */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Quick Add</h4>
                <div className="flex flex-wrap gap-2">
                  {getCommonGroceryItems().slice(0, 15).map(item => (
                    <button
                      key={item}
                      onClick={() => addQuickItem(item)}
                      className="px-3 py-1 bg-gray-100 hover:bg-orange-100 hover:text-orange-700 rounded-full text-sm transition-colors"
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Add */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Or add your own</h4>
                <textarea
                  value={upsellBulkItems}
                  onChange={(e) => setUpsellBulkItems(e.target.value)}
                  className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  placeholder="Add items one per line:&#10;Toilet paper&#10;Paper towels&#10;Laundry detergent"
                />
                {upsellBulkItems.trim() && (
                  <button
                    onClick={handleUpsellBulkAdd}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Items
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleUpsellComplete}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                >
                  Continue to Instacart
                </button>
                <button
                  onClick={() => setShowUpsellModal(false)}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Keep Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}