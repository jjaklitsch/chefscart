'use client'

import { useState } from 'react'
import { ShoppingCart, Mail, Instagram, Youtube, ChevronDown, Star, TrendingUp } from 'lucide-react'
import Link from 'next/link'

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
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({})

  const toggleAccordion = (section: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Popular/Featured links that should be prominent
  const featuredLinks = [
    { label: 'Browse All Recipes', href: '/recipes', icon: '🍽️' },
    { label: 'Quick Weeknight Dinners', href: '/recipes?time=30', icon: '⚡' },
    { label: 'Healthy Meal Prep', href: '/recipes?collection=meal-prep', icon: '🥗' },
    { label: 'My Kitchen Dashboard', href: '/dashboard', icon: '🏠' }
  ]

  const footerSections = {
    'Popular Recipes': {
      links: [
        { label: 'Quick & Easy (30 min)', href: '/recipes?difficulty=easy' },
        { label: 'Keto Recipes', href: '/recipes?diet=keto' },
        { label: 'Vegetarian', href: '/recipes?diet=vegetarian' },
        { label: 'Italian Classics', href: '/recipes?cuisine=italian' },
        { label: 'Mexican Favorites', href: '/recipes?cuisine=mexican' },
        { label: 'Spicy Recipes', href: '/recipes?spice=4' }
      ]
    },
    'Browse by Diet': {
      links: [
        { label: 'Vegan', href: '/recipes?diet=vegan' },
        { label: 'Mediterranean', href: '/recipes?diet=mediterranean' },
        { label: 'Paleo', href: '/recipes?diet=paleo' },
        { label: 'Low-Carb', href: '/recipes?diet=low-carb' },
        { label: 'Pescatarian', href: '/recipes?diet=pescatarian' },
        { label: 'Plant-Forward', href: '/recipes?diet=plant-forward' }
      ]
    },
    'Browse by Cuisine': {
      links: [
        { label: 'Asian Fusion', href: '/recipes?cuisine=chinese' },
        { label: 'Mediterranean', href: '/recipes?cuisine=mediterranean' },
        { label: 'American Comfort', href: '/recipes?cuisine=american' },
        { label: 'Indian Curries', href: '/recipes?cuisine=indian' },
        { label: 'Thai Street Food', href: '/recipes?cuisine=thai' },
        { label: 'French Classics', href: '/recipes?cuisine=french' }
      ]
    },
    'Meal Planning': {
      links: [
        { label: 'Meal Planner', href: '/' },
        { label: 'Grocery Lists', href: '/grocery-list' },
        { label: 'Shop Ingredients', href: '/shop' },
        { label: 'Create Meal Plan', href: '/meal-plan-builder' },
        { label: 'My Favorites', href: '/favorites' }
      ]
    },
    'Support & Info': {
      links: [
        { label: 'FAQ', href: '/faq' },
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Terms of Service', href: '/terms-of-service' },
        { label: 'Disclaimer', href: '/disclaimer' }
      ]
    }
  }

  return (
    <footer className="bg-neutral-100 border-t border-neutral-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Featured Links Section - Prominent placement */}
        <div className="py-8 border-b border-neutral-200">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-neutral-900">Popular on ChefsCart</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3 p-4 bg-white hover:bg-brand-50 rounded-xl border border-neutral-200 hover:border-brand-200 transition-all duration-200 hover:shadow-md"
              >
                <span className="text-2xl">{link.icon}</span>
                <span className="font-medium text-neutral-900 group-hover:text-brand-700 transition-colors">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Company Info - Streamlined */}
            <div className="lg:col-span-4">
              {/* Logo */}
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl p-3 shadow-lg">
                  <ShoppingCart className="h-7 w-7 text-white" />
                </div>
                <span className="ml-3 text-2xl font-display font-bold text-neutral-800">
                  ChefsCart
                </span>
              </div>
              
              {/* Description */}
              <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
                From meal planning to Instacart cart in 5 minutes.
              </p>
              
              {/* Contact Email */}
              <div className="flex items-start mb-8">
                <Mail className="h-5 w-5 text-neutral-500 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Questions or support:</p>
                  <a 
                    href="mailto:support@chefscart.ai" 
                    className="text-brand-600 hover:text-brand-700 font-medium transition-colors"
                  >
                    support@chefscart.ai
                  </a>
                </div>
              </div>
              
              {/* Social Media */}
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-4">
                  Follow us for recipes, tips, and updates
                </p>
                <div className="flex space-x-3">
                  <a 
                    href="#" 
                    className="w-11 h-11 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white hover:from-pink-600 hover:to-purple-700 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                    aria-label="Follow us on Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a 
                    href="#" 
                    className="w-11 h-11 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white hover:from-red-600 hover:to-red-700 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                    aria-label="Follow us on YouTube"
                  >
                    <Youtube className="h-5 w-5" />
                  </a>
                  <a 
                    href="#" 
                    className="w-11 h-11 bg-gradient-to-br from-gray-900 to-black rounded-xl flex items-center justify-center text-white hover:from-black hover:to-gray-800 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                    aria-label="Follow us on TikTok"
                  >
                    <TikTokIcon className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
            
            {/* Navigation Links - Desktop: Multi-column, Mobile: Accordion */}
            <div className="lg:col-span-8">
              {/* Desktop View */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.entries(footerSections).map(([sectionName, section]) => (
                  <div key={sectionName} className="space-y-4">
                    <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                      {sectionName === 'Popular Recipes' && <Star className="w-4 h-4 text-brand-600" />}
                      {sectionName}
                    </h3>
                    <nav className="space-y-2">
                      {section.links.map((link, index) => (
                        <Link
                          key={index}
                          href={link.href}
                          className="block text-neutral-600 hover:text-brand-600 transition-colors duration-200 text-sm leading-relaxed"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </nav>
                  </div>
                ))}
              </div>
              
              {/* Mobile Accordion View */}
              <div className="md:hidden space-y-4">
                {Object.entries(footerSections).map(([sectionName, section]) => {
                  const isOpen = openAccordions[sectionName]
                  return (
                    <div key={sectionName} className="border border-neutral-200 rounded-lg">
                      <button
                        onClick={() => toggleAccordion(sectionName)}
                        className="w-full flex items-center justify-between p-4 bg-white hover:bg-neutral-50 transition-colors"
                      >
                        <span className="font-semibold text-neutral-900 flex items-center gap-2">
                          {sectionName === 'Popular Recipes' && <Star className="w-4 h-4 text-brand-600" />}
                          {sectionName}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-neutral-500 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <nav className="space-y-2">
                            {section.links.map((link, index) => (
                              <Link
                                key={index}
                                href={link.href}
                                className="block text-neutral-600 hover:text-brand-600 transition-colors duration-200 text-sm py-1"
                              >
                                {link.label}
                              </Link>
                            ))}
                          </nav>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            
          </div>
        </div>
        
        {/* Footer Bottom */}
        <div className="border-t border-neutral-200 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-neutral-500 text-sm">
              © {new Date().getFullYear()} ChefsCart. All rights reserved.
            </p>
            <p className="text-neutral-500 text-sm">
              AI-Powered Meal Planning & Grocery Shopping
            </p>
          </div>
        </div>
        
      </div>
    </footer>
  )
}