'use client'

import { useState, useEffect } from 'react'
import { ChefHat, ExternalLink, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { CookingEquipment as EquipmentType, AmazonProduct } from '../types'
import { getSupabaseClient } from '../lib/supabase'

interface CookingEquipmentProps {
  recipeId: string
  recipeCourses: string[]
  recipeCuisines: string[]
  cookingDifficulty: string
  equipmentNeeded?: string[] // Direct from meal record when available
}

export default function CookingEquipment({ 
  recipeId, 
  recipeCourses, 
  recipeCuisines, 
  cookingDifficulty,
  equipmentNeeded 
}: CookingEquipmentProps) {
  const [equipment, setEquipment] = useState<EquipmentType[]>([])
  const [products, setProducts] = useState<{ [key: string]: AmazonProduct[] }>({})
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    loadRecommendedEquipment()
  }, [recipeId, recipeCourses, recipeCuisines, cookingDifficulty])

  const loadRecommendedEquipment = async () => {
    try {
      const supabase = getSupabaseClient()
      let recommendedEquipment: EquipmentType[] = []

      if (equipmentNeeded && equipmentNeeded.length > 0) {
        // Use equipment directly specified in meal record
        const { data: equipmentData, error } = await supabase
          .from('cooking_equipment')
          .select('*')
          .in('name', equipmentNeeded)
          .order('popularity_score', { ascending: false })
        
        if (!error && equipmentData) {
          recommendedEquipment = equipmentData
        }
      } else {
        // Infer equipment based on recipe characteristics
        recommendedEquipment = await inferEquipmentFromRecipe()
      }

      setEquipment(recommendedEquipment)
      
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
      
      const response = await fetch(`/api/amazon/search?q=${encodeURIComponent(searchTerm)}&count=3&category=All`)
      const data = await response.json()

      if (data.success && data.data?.products) {
        setProducts(prev => ({
          ...prev,
          [equipmentId]: data.data.products.slice(0, 2) // Show fewer products in recipe context
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
      
      <div className="p-6">
        <div className="space-y-6">
          {equipment.map((item) => (
            <div key={item.id} className="border-b border-neutral-100 last:border-b-0 pb-6 last:pb-0">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-neutral-800 mb-1">
                    {item.display_name}
                  </h4>
                  <p className="text-sm text-neutral-600 mb-2">
                    {item.description || `Essential ${item.display_name.toLowerCase()} for this recipe.`}
                  </p>
                  <div className="flex items-center gap-4">
                    {item.average_price_range && (
                      <span className="text-sm font-medium text-green-600">
                        {item.average_price_range}
                      </span>
                    )}
                    {item.is_essential && (
                      <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                        Essential
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/shop/search?q=${encodeURIComponent(item.display_name)}`}
                  className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1 whitespace-nowrap ml-4"
                >
                  Shop All
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Product Recommendations */}
              {loadingProducts[item.id] ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-xs text-neutral-600">Loading products...</p>
                </div>
              ) : (products[item.id]?.length || 0) > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products[item.id]?.slice(0, 2).map((product, index) => (
                    <div
                      key={`${product.product_id}-${index}`}
                      className="flex gap-3 bg-neutral-50 rounded-lg p-3 hover:bg-neutral-100 transition-colors"
                    >
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0">
                        {product.product_photos[0] ? (
                          <img
                            src={product.product_photos[0]}
                            alt={product.product_title}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="h-6 w-6 text-neutral-300" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-neutral-800 text-sm line-clamp-2 mb-1">
                          {product.product_title}
                        </h5>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-green-600 text-sm">
                            {formatPrice(product.offer.price)}
                          </div>
                          {product.brand && (
                            <div className="text-xs text-neutral-500 truncate ml-2">
                              {product.brand}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={generateAmazonCartUrl(product)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            Add to Cart
                          </a>
                          <a
                            href={product.product_page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-neutral-500 text-sm">
                  <Link
                    href={`/shop/search?q=${encodeURIComponent(item.display_name)}`}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Search for {item.display_name} on Amazon →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer with link to shop */}
        <div className="mt-6 pt-6 border-t border-neutral-200">
          <div className="text-center">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              <ChefHat className="h-4 w-4" />
              Shop All Kitchen Equipment
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}