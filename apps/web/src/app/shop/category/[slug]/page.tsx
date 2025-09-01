'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { ShopCategory, CookingEquipment, AmazonProduct } from '../../../../../types'
import { getSupabaseClient } from '../../../../../lib/supabase'
import Header from '../../../../../components/Header'
import Footer from '../../../../../components/Footer'
import AmazonProductCard from '../../../../components/shop/AmazonProductCard'
import BackToTop from '../../../../components/shop/BackToTop'
import AmazonDisclaimer from '../../../../components/shop/AmazonDisclaimer'

export default function CategoryPage() {
  const params = useParams()
  const slug = params?.slug as string
  
  const [category, setCategory] = useState<ShopCategory | null>(null)
  const [equipment, setEquipment] = useState<CookingEquipment[]>([])
  const [products, setProducts] = useState<{ [key: string]: AmazonProduct[] }>({})
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState<{ [key: string]: boolean }>({})
  const [scrollPositions, setScrollPositions] = useState<{ [key: string]: number }>({})

  const scrollProducts = (equipmentId: string, direction: 'left' | 'right') => {
    const container = document.getElementById(`products-${equipmentId}`)
    if (!container) return

    const scrollAmount = 300
    const currentScroll = scrollPositions[equipmentId] || 0
    const newPosition = direction === 'left' 
      ? Math.max(0, currentScroll - scrollAmount)
      : currentScroll + scrollAmount

    container.scrollTo({ left: newPosition, behavior: 'smooth' })
    setScrollPositions(prev => ({ ...prev, [equipmentId]: newPosition }))
  }

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
      
      const response = await fetch(`/api/amazon/search?q=${encodeURIComponent(searchTerm)}&count=10&category=All`)
      const data = await response.json()

      if (data.success && data.data?.products) {
        setProducts(prev => ({
          ...prev,
          [equipmentId]: data.data.products.slice(0, 10)
        }))
      }
    } catch (error) {
      console.error(`Error loading products for ${equipmentItem.display_name}:`, error)
    } finally {
      setLoadingProducts(prev => ({ ...prev, [equipmentId]: false }))
    }
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

    const hasMultipleProducts = equipmentProducts.length > 3

    return (
      <div className="relative">
        {hasMultipleProducts && (
          <>
            <button
              onClick={() => scrollProducts(equipmentId, 'left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-neutral-50 shadow-lg rounded-full p-2 transition-all"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5 text-neutral-600" />
            </button>
            <button
              onClick={() => scrollProducts(equipmentId, 'right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-neutral-50 shadow-lg rounded-full p-2 transition-all"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5 text-neutral-600" />
            </button>
          </>
        )}
        
        <div
          id={`products-${equipmentId}`}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {equipmentProducts.map((product, index) => (
            <div key={`${product.product_id}-${index}`} className="flex-shrink-0 w-80">
              <AmazonProductCard
                product={product}
                compact={true}
                dataLastUpdated={new Date()}
              />
            </div>
          ))}
        </div>
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
                        <p className="text-neutral-600 mb-4">
                          {equipmentItem.description || `Essential ${equipmentItem.display_name.toLowerCase()} for your kitchen.`}
                        </p>
                        {equipmentItem.is_essential && (
                          <div>
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                              Essential Kitchen Tool
                            </span>
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

      <AmazonDisclaimer />
      <Footer />
      <BackToTop />
    </div>
  )
}