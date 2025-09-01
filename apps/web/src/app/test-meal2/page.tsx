'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'

interface Recipe {
  id: number
  title: string
  description: string
  prep_time?: number
  cook_time?: number
  cooking_difficulty: string
  cuisines: string[]
  ingredients_json?: any
}

export default function TestMeal2() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMeal2Data = async () => {
      try {
        console.log('Loading meal2 data...')
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('meal2')
          .select('*')
          .order('title')

        if (error) {
          console.error('Supabase error:', error)
          setError(`Database error: ${error.message}`)
          return
        }

        console.log('Loaded recipes:', data?.length)
        setRecipes(data || [])
        
      } catch (err: any) {
        console.error('Fetch error:', err)
        setError(`Fetch error: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadMeal2Data()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50">
        <h1 className="text-3xl font-bold mb-6 text-center">Testing meal2 Data</h1>
        <div className="text-center">Loading meal2 recipes...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 bg-gray-50">
        <h1 className="text-3xl font-bold mb-6 text-center text-red-600">Error</h1>
        <div className="text-center text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-center">Testing meal2 Data</h1>
      <div className="text-center mb-8">
        <span className="text-green-600 font-semibold">✅ Found {recipes.length} recipes in meal2 table</span>
      </div>
      
      <div className="grid gap-6 max-w-4xl mx-auto">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-2">{recipe.title}</h2>
            <p className="text-gray-600 mb-3">{recipe.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong>Prep:</strong> {recipe.prep_time}m
              </div>
              <div>
                <strong>Cook:</strong> {recipe.cook_time}m  
              </div>
              <div>
                <strong>Difficulty:</strong> {recipe.cooking_difficulty}
              </div>
              <div>
                <strong>Cuisines:</strong> {recipe.cuisines?.join(', ')}
              </div>
            </div>

            {recipe.ingredients_json?.ingredients && (
              <div className="mt-4">
                <strong>Ingredients ({recipe.ingredients_json.ingredients.length}):</strong>
                <div className="mt-2 space-y-1">
                  {recipe.ingredients_json.ingredients.map((ing: any, i: number) => (
                    <div key={i} className="text-sm flex justify-between items-center py-1 px-2 bg-gray-50 rounded">
                      <span className="font-medium">{ing.name}</span>
                      <span className="text-gray-600">
                        {ing.quantity} {ing.unit} 
                        <span className="ml-2 text-xs bg-blue-100 px-2 py-1 rounded">
                          {ing.category}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(recipe as any).instructions_json?.steps && (
              <div className="mt-6">
                <strong>Cooking Instructions ({(recipe as any).instructions_json.steps.length} steps):</strong>
                <div className="mt-3 space-y-3">
                  {(recipe as any).instructions_json.steps.map((step: any, i: number) => (
                    <div key={i} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center mb-1">
                        <span className="bg-blue-500 text-white text-sm font-bold px-2 py-1 rounded-full mr-3">
                          {step.step}
                        </span>
                        {step.time_minutes && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {step.time_minutes}min
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {step.instruction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(recipe as any).cooking_equipment && (
              <div className="mt-4">
                <strong>Equipment Needed:</strong>
                <div className="mt-2">
                  {(recipe as any).cooking_equipment.map((item: string, i: number) => (
                    <span key={i} className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}