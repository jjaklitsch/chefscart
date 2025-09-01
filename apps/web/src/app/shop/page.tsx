'use client'

import { useState, useEffect } from 'react'
import { Search, ChefHat, Utensils, Zap, Star } from 'lucide-react'
import Link from 'next/link'
import { ShopCategory, CookingEquipment, AmazonProduct } from '../../../types'
import { getSupabaseClient } from '../../../lib/supabase'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import BackToTop from '../../components/shop/BackToTop'
import AmazonDisclaimer from '../../components/shop/AmazonDisclaimer'

export default function ShopPage() {
  const [categories, setCategories] = useState<ShopCategory[]>([])
  const [featuredEquipment, setFeaturedEquipment] = useState<CookingEquipment[]>([])
  const [popularProducts, setPopularProducts] = useState<AmazonProduct[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadShopData()
  }, [])

  const loadShopData = async () => {
    try {
      const supabase = getSupabaseClient()
      
      // Load categories and equipment in parallel without complex nested queries
      const [categoriesResult, equipmentResult] = await Promise.all([
        supabase
          .from('shop_categories')
          .select('*')
          .eq('is_featured', true)
          .order('sort_order'),
        supabase
          .from('cooking_equipment')
          .select('*')
          .order('popularity_score', { ascending: false })
          .limit(48)
      ]);
      
      // Set categories without equipment count for now
      if (categoriesResult.data) {
        setCategories(categoriesResult.data.map((category: any) => ({
          ...category,
          equipment_count: 0
        })));
      }
      
      // Set equipment with optimized image loading
      if (equipmentResult.data) {
        const equipmentWithImages = await Promise.all(
          equipmentResult.data.map(async (equipment: any) => {
            try {
              // Try equipment_id match first
              let { data: productImage } = await supabase
                .from('amazon_products')
                .select('primary_image_url')
                .eq('equipment_id', equipment.id)
                .not('primary_image_url', 'is', null)
                .limit(1);

              // If no match, try name-based search (simplified)
              if (!(productImage as any)?.[0]?.primary_image_url) {
                const searchTerm = equipment.display_name.toLowerCase();
                const { data: nameMatch } = await supabase
                  .from('amazon_products')
                  .select('primary_image_url')
                  .or(`product_title.ilike.%${searchTerm}%,search_term.ilike.%${searchTerm}%`)
                  .not('primary_image_url', 'is', null)
                  .limit(1);
                
                productImage = nameMatch;
              }

              // Fallback for specific items that commonly have missing images
              let finalImageUrl = (productImage as any)?.[0]?.primary_image_url || null;
              
              // Special fallback for Microplane Grater
              if (!finalImageUrl && equipment.display_name.toLowerCase().includes('microplane')) {
                finalImageUrl = "https://m.media-amazon.com/images/I/313UAorevsL._SL500_.jpg";
              }

              return {
                ...equipment,
                product_image: finalImageUrl
              };
            } catch (error) {
              console.error(`Error loading image for ${equipment.display_name}:`, error);
              return {
                ...equipment,
                product_image: null
              };
            }
          })
        );
        
        setFeaturedEquipment(equipmentWithImages);
      }
      
    } catch (error) {
      console.error('Error loading shop data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/shop/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading shop...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
      <Header />
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-display font-bold mb-6">
              ChefsCart Shop
            </h1>
            <p className="text-xl text-green-100 mb-8 leading-relaxed">
              Discover essential cooking equipment and tools to elevate your culinary adventures. 
              Curated products with Amazon's trusted quality and fast delivery.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <div className="flex bg-white rounded-xl shadow-lg overflow-hidden">
                <input
                  type="text"
                  placeholder="Search for cooking equipment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-6 py-4 text-neutral-800 placeholder-neutral-500 focus:outline-none text-lg"
                />
                <button
                  onClick={handleSearch}
                  className="bg-green-600 hover:bg-green-700 px-8 py-4 transition-colors duration-200"
                >
                  <Search className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-neutral-800 mb-4">
              Shop by Category
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Find the perfect tools for every cooking technique and recipe style
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/shop/category/${category.slug}`}
                className="group h-full"
              >
                <div className="bg-white rounded-2xl shadow-subtle hover:shadow-lg transition-all duration-300 overflow-hidden transform hover:-translate-y-1 h-full flex flex-col">
                  <div className="aspect-video bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center overflow-hidden relative">
                    {category.image_url ? (
                      <img 
                        src={category.image_url} 
                        alt={category.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 bg-white"
                      />
                    ) : (
                      <div className="text-green-600 transform group-hover:scale-110 transition-transform duration-300">
                        {category.name.includes('Knives') && <ChefHat className="h-12 w-12" />}
                        {category.name.includes('Cookware') && <Utensils className="h-12 w-12" />}
                        {category.name.includes('Baking') && <Star className="h-12 w-12" />}
                        {category.name.includes('Appliances') && <Zap className="h-12 w-12" />}
                        {!category.name.includes('Knives') && !category.name.includes('Cookware') && !category.name.includes('Baking') && !category.name.includes('Appliances') && <Utensils className="h-12 w-12" />}
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-display font-semibold text-neutral-800 mb-2 group-hover:text-green-700 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-neutral-600 mb-4 line-clamp-2 flex-1">
                      {category.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm text-neutral-500">
                        {category.equipment_count || 0} products
                      </span>
                      <span className="text-green-600 font-medium group-hover:text-green-700">
                        Shop now →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Essential Equipment */}
      {featuredEquipment.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-display font-bold text-neutral-800 mb-4">
                Kitchen Equipment & Tools
              </h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                From essential basics to specialty tools - everything you need to equip your kitchen for any culinary adventure
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {featuredEquipment.map((equipment) => (
                <Link
                  key={equipment.id}
                  href={`/shop/search?q=${encodeURIComponent(equipment.display_name)}`}
                  className="group h-full"
                >
                  <div className="bg-gradient-to-br from-neutral-50 to-sage-50 rounded-2xl shadow-subtle hover:shadow-lg transition-all duration-300 overflow-hidden transform hover:-translate-y-1 h-full flex flex-col">
                    <div className="aspect-square bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center overflow-hidden relative">
                      {(equipment as any).product_image ? (
                        <img 
                          src={(equipment as any).product_image} 
                          alt={equipment.display_name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 bg-white"
                        />
                      ) : (
                        <div className="text-green-600 transform group-hover:scale-110 transition-transform duration-300">
                          <Utensils className="h-16 w-16" />
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-display font-semibold text-neutral-800 mb-2 group-hover:text-green-700 transition-colors">
                        {equipment.display_name}
                      </h3>
                      <p className="text-neutral-600 mb-4 line-clamp-3 flex-1">
                        {equipment.description || `Essential ${equipment.display_name.toLowerCase()} for your kitchen.`}
                      </p>
                      <div className="flex items-center justify-center mt-auto">
                        <span className="text-green-600 font-medium group-hover:text-green-700">
                          Shop now →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Shop with ChefsCart */}
      <section className="py-16 bg-gradient-to-br from-green-50 to-sage-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-display font-bold text-neutral-800 mb-8">
              Why Shop Kitchen Equipment with ChefsCart?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-green-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <ChefHat className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-800 mb-2">
                  Chef-Curated Selection
                </h3>
                <p className="text-neutral-600">
                  Every product is carefully selected based on our extensive recipe database and cooking requirements
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-800 mb-2">
                  Amazon Quality & Speed
                </h3>
                <p className="text-neutral-600">
                  Backed by Amazon's trusted marketplace with fast shipping and reliable customer service
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Utensils className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-800 mb-2">
                  Recipe Integration
                </h3>
                <p className="text-neutral-600">
                  Equipment recommendations appear directly in our recipes, so you know exactly what you need
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AmazonDisclaimer />
      <Footer />
      <BackToTop />
    </div>
  )
}