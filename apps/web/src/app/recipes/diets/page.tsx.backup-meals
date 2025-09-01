"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Utensils } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Diet {
  name: string
  count: number
  description: string
  icon: string
}

export default function DietsPage() {
  const [diets, setDiets] = useState<Diet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDiets = async () => {
      try {
        const { data: meals, error } = await supabase
          .from('meals')
          .select('diets_supported')
          .not('diets_supported', 'is', null)

        if (error) throw error

        // Count recipes per diet
        const dietCounts: Record<string, number> = {}
        
        meals?.forEach(meal => {
          const diets = meal.diets_supported || []
          diets.forEach((diet: string) => {
            dietCounts[diet] = (dietCounts[diet] || 0) + 1
          })
        })

        // Convert to array with metadata
        const dietData: Diet[] = Object.entries(dietCounts)
          .map(([diet, count]) => ({
            name: diet,
            count,
            description: getDietDescription(diet),
            icon: getDietIcon(diet)
          }))
          .sort((a, b) => b.count - a.count) // Sort by recipe count

        setDiets(dietData)
      } catch (error) {
        console.error('Error fetching diets:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDiets()
  }, [])

  const getDietDescription = (diet: string): string => {
    const descriptions: Record<string, string> = {
      'vegetarian': 'Plant-based recipes with dairy and eggs',
      'vegan': 'Completely plant-based, no animal products',
      'keto': 'Very low-carb, high-fat recipes',
      'paleo': 'Whole foods, no grains or legumes',
      'mediterranean': 'Heart-healthy Mediterranean-style recipes',
      'low-carb': 'Reduced carbohydrate recipes',
      'whole30': 'Clean eating, no processed foods',
      'pescatarian': 'Vegetarian plus fish and seafood',
      'plant-forward': 'Mostly plants with occasional meat',
    }
    return descriptions[diet] || 'Specialized dietary recipes'
  }

  const getDietIcon = (diet: string): string => {
    const icons: Record<string, string> = {
      'vegetarian': '🥬',
      'vegan': '🌱',
      'keto': '🥑',
      'paleo': '🥩',
      'mediterranean': '🫒',
      'low-carb': '🥒',
      'whole30': '🥗',
      'pescatarian': '🐟',
      'plant-forward': '🌿',
    }
    return icons[diet] || '🍽️'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dietary options...</p>
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
              <Utensils className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Browse by Diet</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find recipes that match your dietary preferences and restrictions
          </p>
        </div>

        {/* Diet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {diets.map((diet) => (
            <Link
              key={diet.name}
              href={`/recipes/diet/${encodeURIComponent(diet.name.toLowerCase())}`}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl">{diet.icon}</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors capitalize">
                    {diet.name}
                  </h3>
                  <p className="text-sm text-gray-500">{diet.count} recipes</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {diet.description}
              </p>
            </Link>
          ))}
        </div>

        {diets.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Dietary Categories Found</h2>
            <p className="text-gray-600">Check back later for dietary-specific recipes</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}