"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Globe } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Cuisine {
  name: string
  count: number
  description: string
  flag: string
}

export default function CuisinesPage() {
  const [cuisines, setCuisines] = useState<Cuisine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCuisines = async () => {
      try {
        const { data: meals, error } = await supabase
          .from('meals')
          .select('cuisines')
          .not('cuisines', 'is', null)

        if (error) throw error

        // Count recipes per cuisine
        const cuisineCounts: Record<string, number> = {}
        
        meals?.forEach(meal => {
          const cuisines = meal.cuisines || []
          cuisines.forEach((cuisine: string) => {
            cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1
          })
        })

        // Convert to array with metadata
        const cuisineData: Cuisine[] = Object.entries(cuisineCounts)
          .map(([cuisine, count]) => ({
            name: cuisine,
            count,
            description: getCuisineDescription(cuisine),
            flag: getCuisineFlag(cuisine)
          }))
          .sort((a, b) => b.count - a.count) // Sort by recipe count

        setCuisines(cuisineData)
      } catch (error) {
        console.error('Error fetching cuisines:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCuisines()
  }, [])

  const getCuisineDescription = (cuisine: string): string => {
    const descriptions: Record<string, string> = {
      'american': 'Classic comfort foods and regional specialties',
      'italian': 'Traditional Italian pasta, pizza, and regional dishes',
      'mexican': 'Vibrant Mexican flavors and street food favorites',
      'chinese': 'Authentic Chinese stir-fries and regional cuisines',
      'indian': 'Aromatic Indian curries, biryanis, and regional dishes',
      'thai': 'Balance of sweet, sour, salty, and spicy Thai flavors',
      'japanese': 'Traditional Japanese cuisine and modern interpretations',
      'korean': 'Korean BBQ, kimchi, and fermented flavors',
      'french': 'Classic French techniques and regional specialties',
      'mediterranean': 'Fresh Mediterranean ingredients and healthy preparations',
      'greek': 'Traditional Greek dishes with olive oil and fresh herbs',
      'vietnamese': 'Fresh Vietnamese flavors with herbs and rice noodles',
      'southern': 'Soul food and Southern comfort classics',
      'cajun': 'Spicy Louisiana Creole and Cajun specialties',
    }
    return descriptions[cuisine.toLowerCase()] || 'Traditional recipes from this region'
  }

  const getCuisineFlag = (cuisine: string): string => {
    const flags: Record<string, string> = {
      'american': '🇺🇸',
      'italian': '🇮🇹',
      'mexican': '🇲🇽',
      'chinese': '🇨🇳',
      'indian': '🇮🇳',
      'thai': '🇹🇭',
      'japanese': '🇯🇵',
      'korean': '🇰🇷',
      'french': '🇫🇷',
      'mediterranean': '🇬🇷',
      'greek': '🇬🇷',
      'vietnamese': '🇻🇳',
      'southern': '🇺🇸',
      'cajun': '🇺🇸',
    }
    return flags[cuisine.toLowerCase()] || '🌍'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading cuisines...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <Link
            href="/recipes"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Recipes
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-orange-100 rounded-full p-3">
              <Globe className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Browse by Cuisine</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore authentic recipes from around the world
          </p>
        </div>

        {/* Cuisine Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cuisines.map((cuisine) => (
            <Link
              key={cuisine.name}
              href={`/recipes/cuisine/${encodeURIComponent(cuisine.name.toLowerCase())}`}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl">{cuisine.flag}</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors capitalize">
                    {cuisine.name}
                  </h3>
                  <p className="text-sm text-gray-500">{cuisine.count} recipes</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {cuisine.description}
              </p>
            </Link>
          ))}
        </div>

        {cuisines.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🌍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Cuisines Found</h2>
            <p className="text-gray-600">Check back later for international recipes</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}