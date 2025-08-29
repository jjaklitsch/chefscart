'use client'

import { ShoppingCart, Mail, Instagram, Youtube } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '../lib/supabase'

// TikTok icon component (not available in lucide-react)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  )
}

export default function Footer() {
  const [popularCategories, setPopularCategories] = useState<{
    cuisines: string[]
    courses: string[]
    diets: string[]
  }>({ cuisines: [], courses: [], diets: [] })

  useEffect(() => {
    loadPopularCategories()
  }, [])

  const loadPopularCategories = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('meals')
        .select('cuisines, courses, diets_supported')
        .limit(100) // Load a sample to get popular categories

      if (error) {
        console.warn('Failed to load categories for footer:', error)
        return
      }

      // Count frequency of each category
      const cuisineCount: { [key: string]: number } = {}
      const courseCount: { [key: string]: number } = {}
      const dietCount: { [key: string]: number } = {}

      data.forEach((meal: any) => {
        meal.cuisines?.forEach((cuisine: string) => {
          cuisineCount[cuisine] = (cuisineCount[cuisine] || 0) + 1
        })
        meal.courses?.forEach((course: string) => {
          courseCount[course] = (courseCount[course] || 0) + 1
        })
        meal.diets_supported?.forEach((diet: string) => {
          dietCount[diet] = (dietCount[diet] || 0) + 1
        })
      })

      // Get top categories by frequency
      const topCuisines = Object.entries(cuisineCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([cuisine]) => cuisine)

      const topCourses = Object.entries(courseCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([course]) => course)

      const topDiets = Object.entries(dietCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([diet]) => diet)

      setPopularCategories({
        cuisines: topCuisines,
        courses: topCourses,
        diets: topDiets
      })
    } catch (error) {
      console.warn('Error loading popular categories:', error)
    }
  }

  const createCategorySlug = (category: string) => {
    return category.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  }

  return (
    <footer className="bg-gradient-to-br from-neutral-50 to-sage-50 border-t border-neutral-200 mt-8">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-lg p-2 shadow-brand">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-display font-bold text-neutral-800">
                ChefsCart
              </span>
            </div>
            <p className="text-neutral-600 leading-relaxed mb-6 max-w-md">
              AI-powered meal planning that turns your dietary preferences into a complete, 
              shoppable grocery cart in minutes. Delicious recipes, smart shopping, 
              delivered to your door.
            </p>
            <div className="flex items-center space-x-2 text-neutral-600">
              <Mail className="h-4 w-4" />
              <a 
                href="mailto:support@chefscart.ai" 
                className="text-brand-600 hover:text-brand-700 font-medium underline decoration-brand-300 hover:decoration-brand-500 transition-colors duration-200"
              >
                support@chefscart.ai
              </a>
            </div>
          </div>

          {/* Recipes */}
          <div>
            <h3 className="font-display font-semibold text-neutral-800 mb-4">Recipes</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/recipes" 
                  className="text-neutral-600 hover:text-brand-700 transition-colors duration-200"
                >
                  Browse All Recipes
                </Link>
              </li>
              {/* Dynamic popular cuisines */}
              {popularCategories.cuisines.slice(0, 2).map(cuisine => (
                <li key={cuisine}>
                  <Link 
                    href={`/recipes?cuisine=${encodeURIComponent(cuisine)}`}
                    className="text-neutral-600 hover:text-brand-700 transition-colors duration-200"
                  >
                    {cuisine.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')} Recipes
                  </Link>
                </li>
              ))}
              {/* Dynamic popular courses */}
              {popularCategories.courses.slice(0, 2).map(course => (
                <li key={course}>
                  <Link 
                    href={`/recipes?course=${encodeURIComponent(course)}`}
                    className="text-neutral-600 hover:text-brand-700 transition-colors duration-200"
                  >
                    {course.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')} Recipes
                  </Link>
                </li>
              ))}
              {/* Dynamic popular diet */}
              {popularCategories.diets.slice(0, 1).map(diet => (
                <li key={diet}>
                  <Link 
                    href={`/recipes?diet=${encodeURIComponent(diet)}`}
                    className="text-neutral-600 hover:text-brand-700 transition-colors duration-200"
                  >
                    {diet.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')} Recipes
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Categories */}
          <div>
            <h3 className="font-display font-semibold text-neutral-800 mb-4">Popular</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/recipes?difficulty=easy"
                  className="text-neutral-600 hover:text-brand-700 transition-colors duration-200"
                >
                  Quick & Easy
                </Link>
              </li>
              <li>
                <Link 
                  href="/quick-plan" 
                  className="text-neutral-600 hover:text-brand-700 transition-colors duration-200"
                >
                  Meal Planner
                </Link>
              </li>
              <li>
                <Link 
                  href="/#faq" 
                  className="text-neutral-600 hover:text-brand-700 transition-colors duration-200"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy-policy" 
                  className="text-neutral-600 hover:text-brand-700 transition-colors duration-200"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms-of-service" 
                  className="text-neutral-600 hover:text-brand-700 transition-colors duration-200"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-display font-semibold text-neutral-800 mb-4">Connect</h3>
            <div className="space-y-3">
              <p className="text-neutral-600 text-sm">
                Follow us for recipes, tips, and updates
              </p>
              <div className="flex space-x-3">
                <a 
                  href="#" 
                  className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white hover:from-pink-600 hover:to-purple-700 transition-all duration-200 hover:scale-110 hover:shadow-lg"
                  aria-label="Follow us on Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center text-white hover:from-red-600 hover:to-red-700 transition-all duration-200 hover:scale-110 hover:shadow-lg"
                  aria-label="Follow us on YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 bg-gradient-to-br from-gray-900 to-black rounded-lg flex items-center justify-center text-white hover:from-black hover:to-gray-800 transition-all duration-200 hover:scale-110 hover:shadow-lg"
                  aria-label="Follow us on TikTok"
                >
                  <TikTokIcon className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-neutral-200 pt-8 mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-neutral-500 text-sm">
              © {new Date().getFullYear()} ChefsCart. All rights reserved.
            </p>
            <p className="text-neutral-500 text-sm mt-2 sm:mt-0">
              AI-Powered Meal Planning & Grocery Shopping
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}