'use client'

import Link from 'next/link'
import { ChefHat, Clock, Utensils, Flame, Users, Leaf } from 'lucide-react'

interface RecipesMegaMenuProps {
  isVisible: boolean
  onClose: () => void
}

export default function RecipesMegaMenu({ isVisible, onClose }: RecipesMegaMenuProps) {
  if (!isVisible) return null

  const recipeCategories = {
    'By Cooking Time': {
      icon: Clock,
      links: [
        { label: 'Quick & Easy (30 min)', href: '/recipes?time=30', description: 'Fast weeknight dinners' },
        { label: 'Medium (30-60 min)', href: '/recipes?time=60', description: 'Weekend cooking projects' },
        { label: 'Long Cook (60+ min)', href: '/recipes?time=long', description: 'Slow roasts & braises' },
      ]
    },
    'By Difficulty': {
      icon: ChefHat,
      links: [
        { label: 'Beginner Friendly', href: '/recipes?difficulty=easy', description: 'Simple techniques & ingredients' },
        { label: 'Intermediate', href: '/recipes?difficulty=medium', description: 'Build your cooking skills' },
        { label: 'Advanced', href: '/recipes?difficulty=challenging', description: 'Master chef techniques' },
      ]
    },
    'By Diet & Lifestyle': {
      icon: Leaf,
      links: [
        { label: 'Vegetarian', href: '/recipes?diet=vegetarian', description: 'Plant-based with dairy/eggs' },
        { label: 'Vegan', href: '/recipes?diet=vegan', description: 'Completely plant-based' },
        { label: 'Keto', href: '/recipes?diet=keto', description: 'Low-carb, high-fat recipes' },
        { label: 'Mediterranean', href: '/recipes?diet=mediterranean', description: 'Heart-healthy eating' },
        { label: 'Paleo', href: '/recipes?diet=paleo', description: 'Whole foods approach' },
      ]
    },
    'By Cuisine': {
      icon: Utensils,
      links: [
        { label: 'Italian', href: '/recipes?cuisine=italian', description: 'Pasta, pizza & classics' },
        { label: 'Mexican', href: '/recipes?cuisine=mexican', description: 'Tacos, enchiladas & more' },
        { label: 'Asian', href: '/recipes?cuisine=chinese', description: 'Stir-fries & noodles' },
        { label: 'Mediterranean', href: '/recipes?cuisine=mediterranean', description: 'Fresh, healthy flavors' },
        { label: 'American', href: '/recipes?cuisine=american', description: 'Comfort food classics' },
        { label: 'Indian', href: '/recipes?cuisine=indian', description: 'Curries & spice blends' },
      ]
    },
    'By Spice Level': {
      icon: Flame,
      links: [
        { label: 'Mild', href: '/recipes?spice=1', description: 'Family-friendly heat' },
        { label: 'Medium', href: '/recipes?spice=3', description: 'Noticeable warmth' },
        { label: 'Hot', href: '/recipes?spice=4', description: 'Serious heat lovers' },
        { label: 'Very Spicy', href: '/recipes?spice=5', description: 'Maximum heat' },
      ]
    }
  }

  const featuredCollections = [
    { 
      title: 'Quick Weeknight Dinners', 
      href: '/recipes?collection=weeknight',
      description: 'Ready in 30 minutes or less',
      image: '🍳'
    },
    { 
      title: 'Healthy Meal Prep', 
      href: '/recipes?collection=meal-prep',
      description: 'Make ahead for the week',
      image: '🥗'
    },
    { 
      title: 'Date Night Specials', 
      href: '/recipes?collection=date-night',
      description: 'Impress your special someone',
      image: '🕯️'
    }
  ]

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Mega Menu Panel */}
      <div className="absolute top-full left-0 right-0 bg-white border-b border-neutral-200 shadow-xl z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Main Categories - Takes up 3 columns */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.entries(recipeCategories).map(([categoryName, category]) => {
                  const Icon = category.icon
                  return (
                    <div key={categoryName} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                        <Icon className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-neutral-900">{categoryName}</h3>
                      </div>
                      <div className="space-y-3">
                        {category.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={onClose}
                            className="group block hover:bg-neutral-50 px-2 py-1 rounded-lg transition-colors"
                          >
                            <div className="font-medium text-neutral-900 group-hover:text-green-600 transition-colors">
                              {link.label}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Featured Collections Sidebar - Takes up 1 column */}
            <div className="lg:col-span-1 lg:border-l lg:border-neutral-200 lg:pl-8">
              <h3 className="font-semibold text-neutral-900 mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Featured Collections
              </h3>
              <div className="space-y-4">
                {featuredCollections.map((collection) => (
                  <Link
                    key={collection.href}
                    href={collection.href}
                    onClick={onClose}
                    className="group block bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 p-4 rounded-xl transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{collection.image}</div>
                      <div>
                        <div className="font-medium text-green-900 group-hover:text-green-700 transition-colors">
                          {collection.title}
                        </div>
                        <div className="text-sm text-green-700 mt-1">
                          {collection.description}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                
                {/* Browse All Link */}
                <Link
                  href="/recipes"
                  onClick={onClose}
                  className="block text-center bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors mt-6"
                >
                  Browse All Recipes →
                </Link>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </>
  )
}