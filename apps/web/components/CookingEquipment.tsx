'use client'

import { useState, useEffect } from 'react'
import { ChefHat, ExternalLink, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { CookingEquipment as EquipmentType, AmazonProduct } from '../types'
import { getSupabaseClient } from '../lib/supabase'
import { useCart } from '../contexts/CartContext'

interface CookingEquipmentProps {
  recipeId: string
  recipeCourses: string[]
  recipeCuisines: string[]
  cookingDifficulty: string
  equipmentNeeded?: string[] // Direct from meal record cooking_equipment field when available
}

export default function CookingEquipment({ 
  recipeId, 
  recipeCourses, 
  recipeCuisines, 
  cookingDifficulty,
  equipmentNeeded 
}: CookingEquipmentProps) {
  const [equipment, setEquipment] = useState<EquipmentType[]>([])
  const [products, setProducts] = useState<{ [key: string]: AmazonProduct }>({}) // Single product per equipment
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState<{ [key: string]: boolean }>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set())
  const { addItem, itemCount } = useCart()

  useEffect(() => {
    loadRecommendedEquipment()
  }, [recipeId, recipeCourses, recipeCuisines, cookingDifficulty])

  const loadRecommendedEquipment = async () => {
    try {
      const supabase = getSupabaseClient()
      let recommendedEquipment: EquipmentType[] = []

      if (equipmentNeeded && equipmentNeeded.length > 0) {
        console.log('Using specific equipment from recipe data:', equipmentNeeded)
        // Use equipment directly specified in meal record
        const { data: equipmentData, error } = await supabase
          .from('cooking_equipment')
          .select('*')
          .in('name', equipmentNeeded)
          .order('popularity_score', { ascending: false })
        
        if (!error && equipmentData) {
          recommendedEquipment = equipmentData
          console.log('Found equipment in database:', equipmentData.map(e => e.display_name))
        } else {
          console.log('Error finding equipment in database:', error)
        }
      } else {
        console.log('No cooking_equipment data, using inference logic')
        // Infer equipment based on recipe characteristics
        recommendedEquipment = await inferEquipmentFromRecipe()
      }

      setEquipment(recommendedEquipment)
      
      // Debug: Log equipment and their categories
      console.log('Loaded equipment:', recommendedEquipment.map(item => ({
        name: item.display_name,
        category: getEquipmentCategory(item.display_name)
      })))
      
      // Load Amazon products for each equipment item
      recommendedEquipment.forEach((item) => {
        loadProductsForEquipment(item)
      })

    } catch (error) {
      console.error('Error loading cooking equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const inferEquipmentFromRecipe = async (): Promise<EquipmentType[]> => {
    const supabase = getSupabaseClient()
    const essentialItems: string[] = ['knife', 'cutting board', 'mixing bowl']
    
    // Add equipment based on course type
    if (recipeCourses.some(course => course.toLowerCase().includes('bake') || course.toLowerCase().includes('dessert'))) {
      essentialItems.push('baking sheet', 'mixing bowl', 'measuring cup')
    }
    
    if (recipeCourses.some(course => course.toLowerCase().includes('stir fry'))) {
      essentialItems.push('wok', 'spatula')
    }
    
    // Add equipment based on cooking difficulty
    if (cookingDifficulty.toLowerCase() === 'challenging') {
      essentialItems.push('chef\'s knife', 'food processor', 'kitchen thermometer')
    }
    
    // Add equipment based on cuisine
    if (recipeCuisines.some(cuisine => cuisine.toLowerCase().includes('italian'))) {
      essentialItems.push('pasta machine', 'grater')
    }
    
    if (recipeCuisines.some(cuisine => cuisine.toLowerCase().includes('asian'))) {
      essentialItems.push('wok', 'rice cooker')
    }

    // Load equipment from database
    const { data: equipmentData, error } = await supabase
      .from('cooking_equipment')
      .select('*')
      .or(essentialItems.map(item => `name.ilike.%${item}%`).join(','))
      .order('popularity_score', { ascending: false })
      .limit(6)
    
    return equipmentData || []
  }

  const loadProductsForEquipment = async (equipmentItem: EquipmentType) => {
    const equipmentId = equipmentItem.id
    setLoadingProducts(prev => ({ ...prev, [equipmentId]: true }))

    try {
      // Use the first Amazon search term for the equipment
      const searchTerm = equipmentItem.amazon_search_terms[0] || equipmentItem.display_name
      
      const response = await fetch(`/api/amazon/search?q=${encodeURIComponent(searchTerm)}&count=10&category=All`)
      const data = await response.json()

      if (data.success && data.data?.products && data.data.products.length > 0) {
        // Get the first (best) product only
        setProducts(prev => ({
          ...prev,
          [equipmentId]: data.data.products[0]
        }))
      }
    } catch (error) {
      console.error(`Error loading products for ${equipmentItem.display_name}:`, error)
    } finally {
      setLoadingProducts(prev => ({ ...prev, [equipmentId]: false }))
    }
  }

  const generateAmazonCartUrl = (product: AmazonProduct) => {
    const asin = product.product_id
    const affiliateId = 'chefscart-20'
    return `https://www.amazon.com/dp/${asin}?tag=${affiliateId}&linkCode=osi&th=1&psc=1`
  }

  const formatPrice = (price: string) => {
    return price.replace(/[^\d.,]/g, '').trim() || price
  }

  const handleAddToCart = (product: AmazonProduct, equipmentName: string) => {
    const cartItem = {
      asin: product.product_id,
      title: product.product_title,
      price: product.offer.price,
      image: product.product_photos[0] || '',
      brand: product.brand || '',
      source: 'equipment' as const,
      sourceId: equipmentName
    }
    addItem(cartItem)
    
    // Add visual feedback
    setAddedItems(prev => new Set(prev).add(product.product_id))
    
    // Remove feedback after 2 seconds
    setTimeout(() => {
      setAddedItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(product.product_id)
        return newSet
      })
    }, 2000)
  }

  // Equipment categories for filtering
  const equipmentCategories = [
    { id: 'all', label: 'All Equipment' },
    { id: 'knives', label: 'Knives & Cutting' },
    { id: 'cookware', label: 'Pots & Pans' },
    { id: 'baking', label: 'Baking Tools' },
    { id: 'prep', label: 'Prep Tools' },
    { id: 'appliances', label: 'Small Appliances' }
  ]

  const getEquipmentCategory = (equipmentName: string): string => {
    const name = equipmentName.toLowerCase()
    // More comprehensive matching for knives & cutting
    if (name.includes('knife') || name.includes('cutting') || name.includes('grater') || 
        name.includes('chef') || name.includes('blade') || name.includes('peeler') ||
        name.includes('slicer') || name.includes('chopper')) return 'knives'
    // Cookware category
    if (name.includes('pan') || name.includes('pot') || name.includes('wok') || 
        name.includes('skillet') || name.includes('saucepan') || name.includes('frying') ||
        name.includes('dutch oven') || name.includes('casserole')) return 'cookware'
    // Baking tools
    if (name.includes('baking') || name.includes('sheet') || name.includes('measuring') || 
        name.includes('whisk') || name.includes('mixer') || name.includes('cake') ||
        name.includes('cookie') || name.includes('muffin') || name.includes('loaf')) return 'baking'
    // Small appliances
    if (name.includes('processor') || name.includes('machine') || name.includes('cooker') || 
        name.includes('blender') || name.includes('toaster') || name.includes('microwave') ||
        name.includes('electric') || name.includes('stand mixer')) return 'appliances'
    // Prep tools (default for bowls, utensils, etc)
    return 'prep'
  }

  const filteredEquipment = selectedCategory === 'all' 
    ? equipment 
    : equipment.filter(item => getEquipmentCategory(item.display_name) === selectedCategory)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-subtle border border-neutral-200 overflow-hidden">
        <div className="bg-gradient-to-r from-neutral-50 to-sage-50 px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 rounded-lg p-2">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-neutral-800">Required Equipment</h3>
              <p className="text-sm text-neutral-600">Loading equipment recommendations...</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="space-y-4">
              <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (equipment.length === 0) {
    return null // Don't show section if no equipment found
  }

  return (
    <div className="bg-white rounded-2xl shadow-subtle border border-neutral-200 overflow-hidden">
      <div className="bg-gradient-to-r from-neutral-50 to-sage-50 px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 rounded-lg p-2">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-neutral-800">Required Equipment</h3>
              <p className="text-sm text-neutral-600">Essential tools for making this recipe</p>
            </div>
          </div>
        </div>
        
        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {equipmentCategories.map((category) => {
            const categoryCount = category.id === 'all' 
              ? equipment.length 
              : equipment.filter(item => getEquipmentCategory(item.display_name) === category.id).length
            
            // Don't show categories with 0 items (except "all")
            if (categoryCount === 0 && category.id !== 'all') {
              return null
            }
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-neutral-600 hover:bg-green-50 hover:text-green-600 border border-neutral-200'
                }`}
              >
                {category.label} ({categoryCount})
              </button>
            )
          }).filter(Boolean)}
        </div>
      </div>
      
      <div className="p-6">
        {filteredEquipment.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <ChefHat className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm">No equipment found for this category</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="mt-2 text-green-600 hover:text-green-700 font-medium text-sm"
            >
              View All Equipment
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEquipment.map((item) => (
            <div key={item.id} className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-md transition-all h-full flex flex-col">
              {/* Equipment header */}
              <div className="mb-3">
                <h4 className="font-semibold text-neutral-800 text-base">
                  {item.display_name}
                </h4>
              </div>

              {/* Single Product Display */}
              {loadingProducts[item.id] ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-xs text-neutral-600">Loading...</p>
                </div>
              ) : products[item.id] ? (
                <div className="flex flex-col flex-1">
                  {/* Product Image */}
                  <div className="w-full h-32 bg-neutral-50 rounded-lg overflow-hidden flex items-center justify-center mb-3">
                    {products[item.id].product_photos[0] ? (
                      <img
                        src={products[item.id].product_photos[0]}
                        alt={products[item.id].product_title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <ShoppingCart className="h-8 w-8 text-neutral-300" />
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex flex-col flex-1">
                    <h5 className="font-medium text-neutral-800 text-sm line-clamp-2 leading-tight mb-2">
                      {products[item.id].product_title}
                    </h5>
                    {products[item.id].brand && (
                      <div className="text-xs text-neutral-500 mb-2">
                        {products[item.id].brand}
                      </div>
                    )}
                    <div className="font-bold text-green-600 text-lg mb-3">
                      ${formatPrice(products[item.id].offer.price)}
                    </div>
                    <div className="mt-auto">
                      <button
                        onClick={() => handleAddToCart(products[item.id], item.display_name)}
                        className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          addedItems.has(products[item.id].product_id)
                            ? 'bg-green-700 text-white scale-105' 
                            : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
                        }`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {addedItems.has(products[item.id].product_id) ? 'Added!' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-neutral-500 text-sm flex-1 flex items-center justify-center">
                  <Link
                    href={`/shop/search?q=${encodeURIComponent(item.display_name)}`}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Search for {item.display_name} →
                  </Link>
                </div>
              )}
              </div>
            ))}
          </div>
        )}

        {/* Footer with shop link */}
        <div className="text-center mt-6">
          {itemCount > 0 && (
            <div className="text-sm text-neutral-600 mb-4">
              ✅ {itemCount} item{itemCount !== 1 ? 's' : ''} added to cart - Check top right to review & checkout
            </div>
          )}
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition-colors"
          >
            Shop All Equipment
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}