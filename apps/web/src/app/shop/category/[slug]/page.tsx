'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, ShoppingCart, ExternalLink, Star } from 'lucide-react'
import Link from 'next/link'
import { ShopCategory, CookingEquipment, AmazonProduct } from '../../../../../types'
import { getSupabaseClient } from '../../../../../lib/supabase'
import Header from '../../../../../components/Header'
import Footer from '../../../../../components/Footer'

export default function CategoryPage() {
  const params = useParams()
  const slug = params?.slug as string
  
  const [category, setCategory] = useState<ShopCategory | null>(null)
  const [equipment, setEquipment] = useState<CookingEquipment[]>([])
  const [products, setProducts] = useState<{ [key: string]: AmazonProduct[] }>({})
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    if (slug) {
      loadCategoryData()
    }
  }, [slug])

  const loadCategoryData = async () => {
    try {
      const supabase = getSupabaseClient()
      
      // Load category info
      const { data: categoryData, error: categoryError } = await supabase
        .from('shop_categories')
        .select('*')
        .eq('slug', slug)
        .single()
      
      if (categoryError || !categoryData) {
        console.error('Category not found:', categoryError)
        setLoading(false)
        return
      }

      const validCategory = categoryData as any
      setCategory(validCategory)
      const categoryId = validCategory.id

      // Load equipment in this category
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('cooking_equipment')
        .select(`
          *,
          equipment_categories!inner(
            category_id
          )
        `)
        .eq('equipment_categories.category_id', categoryId)
        .order('popularity_score', { ascending: false })
      
      if (equipmentError) {
        console.error('Error loading equipment:', equipmentError)
      } else if (equipmentData) {
        setEquipment(equipmentData)
        // Start loading products for each equipment item
        equipmentData.forEach((item: CookingEquipment) => {
          loadProductsForEquipment(item)
        })
      }

    } catch (error) {
      console.error('Error loading category data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProductsForEquipment = async (equipmentItem: CookingEquipment) => {
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
          [equipmentId]: data.data.products.slice(0, 3)
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

  const renderStars = (rating?: number) => {
    if (!rating) return null
    
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-3 h-3 fill-yellow-400/50 text-yellow-400" />)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-3 h-3 text-neutral-300" />)
    }

    return (
      <div className="flex items-center gap-1">
        {stars}
        <span className="text-xs text-neutral-600 ml-1">({rating.toFixed(1)})</span>
      </div>
    )
  }

  const renderProductsForEquipment = (equipmentItem: CookingEquipment) => {
    const equipmentId = equipmentItem.id
    const equipmentProducts = products[equipmentId]
    
    if (loadingProducts[equipmentId]) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-sm text-neutral-600">Loading products...</p>
        </div>
      )
    }

    if (!equipmentProducts || equipmentProducts.length === 0) {
      return (
        <div className="text-center py-8 text-neutral-500">
          <p>Products are being loaded...</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {equipmentProducts.slice(0, 3).map((product, index) => (
          <div
            key={`${product.product_id}-${index}`}
            className="border border-neutral-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            {/* Product Image */}
            <div className="aspect-square bg-neutral-50 overflow-hidden">
              {product.product_photos[0] ? (
                <img
                  src={product.product_photos[0]}
                  alt={product.product_title}
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="h-12 w-12 text-neutral-300" />
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="p-4">
              <h4 className="font-medium text-neutral-800 mb-2 line-clamp-2 text-sm">
                {product.product_title}
              </h4>

              {product.rating && (
                <div className="mb-2">
                  {renderStars(product.rating)}
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-green-600">
                  {formatPrice(product.offer.price)}
                </div>
                {product.brand && (
                  <div className="text-xs text-neutral-500">
                    {product.brand}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <a
                  href={generateAmazonCartUrl(product)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <ShoppingCart className="h-3 w-3" />
                  Add to Cart
                </a>
                <a
                  href={product.product_page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Details
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading category...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-neutral-800 mb-4">Category Not Found</h1>
          <p className="text-neutral-600 mb-8">The category you're looking for doesn't exist.</p>
          <Link
            href="/shop"
            className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
      <Header />
      {/* Category Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Shop
            </Link>
            
            <h1 className="text-4xl font-display font-bold text-neutral-800 mb-4">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-lg text-neutral-600 leading-relaxed">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {equipment.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-neutral-800 mb-2">No equipment found</h3>
              <p className="text-neutral-600">This category is being updated with new products.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {equipment.map((equipmentItem) => (
                <div key={equipmentItem.id} className="bg-white rounded-2xl shadow-subtle overflow-hidden">
                  {/* Equipment Header */}
                  <div className="p-8 border-b border-neutral-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-2">
                          {equipmentItem.display_name}
                        </h2>
                        <p className="text-neutral-600 mb-2">
                          {equipmentItem.description || `Essential ${equipmentItem.display_name.toLowerCase()} for your kitchen.`}
                        </p>
                        {equipmentItem.average_price_range && (
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-green-600">
                              Typical Price: {equipmentItem.average_price_range}
                            </span>
                            {equipmentItem.is_essential && (
                              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                Essential
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/shop/search?q=${encodeURIComponent(equipmentItem.display_name)}`}
                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg font-medium transition-colors whitespace-nowrap"
                      >
                        View All Options
                      </Link>
                    </div>
                  </div>

                  {/* Products Grid */}
                  <div className="p-8">
                    {renderProductsForEquipment(equipmentItem)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}