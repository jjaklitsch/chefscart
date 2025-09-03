"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Clock, DollarSign, Plus, Minus, ShoppingCart, ArrowRight, CheckCircle } from 'lucide-react'
import ZipCodeInput from '../../components/ZipCodeInput'
import HeadlineABTest from '../../components/HeadlineABTest'
import Header from '../../components/Header'
import MealShowcase from '../../components/MealShowcase'
import HomePricingSection from '../../components/HomePricingSection'
import PricingCTA from '../../components/PricingCTA'
import Footer from '../../components/Footer'
import analytics from '../../lib/analytics'
import { useAuth } from '../../contexts/AuthContext'
import { isPaymentSystemEnabled } from '../../lib/feature-flags'

export default function Home() {
  const [zipCode, setZipCode] = useState('')
  const [isValidZip, setIsValidZip] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const [validationState, setValidationState] = useState<'idle' | 'valid' | 'invalid' | 'no-coverage'>('idle')
  const [openFaqItems, setOpenFaqItems] = useState<Set<number>>(new Set())
  const router = useRouter()
  const { user, loading } = useAuth()

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (!loading && user) {
      console.log('User logged in, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Track page view with experiment context
  useEffect(() => {
    const userId = localStorage.getItem('chefscart_user_id') || '';
    analytics.trackPageView('landing', userId);
  }, []);

  const handleZipValidation = (zip: string, isValid: boolean) => {
    setZipCode(zip)
    setIsValidZip(isValid)
  }

  const handleValidationMessage = (message: string, state: 'idle' | 'valid' | 'invalid' | 'no-coverage') => {
    setValidationMessage(message)
    setValidationState(state)
  }

  const handleGetStarted = () => {
    if (isValidZip && zipCode) {
      // Track button click before navigation
      const userId = localStorage.getItem('chefscart_user_id') || '';
      analytics.trackButtonClick('get_started_cta', 'Get Started →', userId);
      
      // Store zipCode in localStorage and go directly to onboarding
      localStorage.setItem('chefscart_zipcode', zipCode);
      router.push(`/onboarding`)
    }
  }

  const toggleFaqItem = (index: number) => {
    const newOpenItems = new Set(openFaqItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenFaqItems(newOpenItems)
  }

  const faqData = [
    {
      question: "What is ChefsCart?",
      answer: "ChefsCart is a meal‑planning tool that builds a fully shoppable Instacart cart in minutes. Tell us how many meals and servings you need, set any dietary preferences, and we do the rest—personalized recipes, scaled portions, smart grocery selection, and a one‑click checkout link."
    },
    {
      question: "How does the Instacart partnership work?",
      answer: "We partner with Instacart to turn every ingredient in your approved meal plan into a real Instacart shopping‑list page. When you click \"Checkout on Instacart\" you're sent to Instacart's app or website, where you pick a store, confirm items, and pay. Instacart then handles delivery logistics, replacements, and order support."
    },
    {
      question: "How much does ChefsCart cost?",
      answer: "ChefsCart is currently free during our beta period. You only pay for groceries through Instacart—we never mark up food prices or charge additional fees."
    },
    {
      question: "Can ChefsCart handle special diets or allergies?",
      answer: "Absolutely. During onboarding you can choose dietary styles like Vegan, Keto, Gluten‑Free, Paleo, Mediterranean, and more. You can also specify foods to avoid (e.g., nuts, shellfish, dairy) and we'll filter recipes to match your needs."
    },
    {
      question: "Where is ChefsCart available?",
      answer: "Anywhere Instacart delivers in the United States and Canada. During signup we check your ZIP/postal code; if no local store is supported you can join our wait‑list and we'll notify you as soon as coverage expands."
    },
    {
      question: "Do I need an Instacart account?",
      answer: "Yes. Instacart requires you to log in or create a free account before checkout so they can store your address, payment card, and delivery preferences. The sign‑up takes about 30 seconds the first time you use ChefsCart."
    },
    {
      question: "How accurate are the grocery quantities?",
      answer: "ChefsCart automatically scales all ingredients based on your serving size. For example, if a recipe serves 4 and you need 6 servings, we'll multiply all ingredients by 1.5x. The quantities are optimized for standard package sizes when possible (e.g., buying 2 lbs of chicken instead of 1.73 lbs)."
    },
    {
      question: "Can I customize my shopping cart?",
      answer: "Yes. After selecting your meals, you'll review a consolidated shopping list where you can adjust quantities, remove items you already have, and see exactly what will be added to your Instacart cart. You can also modify items directly in Instacart before checkout."
    }
  ]

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-neutral-800">Loading...</h2>
        </div>
      </div>
    )
  }

  // Show nothing briefly if user is authenticated (will redirect)
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-health-gradient mobile-safe">
      <Header />
      <div className="container mx-auto mobile-container py-8 lg:py-12">
        {/* Hero Section */}
        <header className="text-center mb-12 lg:mb-16 animate-fade-in">
          <div className="flex items-center justify-center mb-4 lg:mb-6">
            <ShoppingCart className="h-8 w-8 lg:h-12 lg:w-12 text-brand-600 mr-2 lg:mr-3" />
            <h1 className="text-display font-display font-bold text-neutral-800">ChefsCart</h1>
          </div>
          <div className="max-w-2xl mx-auto">
            <HeadlineABTest className="text-center" />
          </div>
        </header>

        {/* ZIP Code Section */}
        <div className="max-w-lg mx-auto mb-12 lg:mb-16 animate-slide-up">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 mobile-button-group">
              <div className="flex-1">
                <ZipCodeInput 
                  onZipValidation={handleZipValidation}
                  onSubmit={handleGetStarted}
                  showFullWidthMessage={true}
                  onValidationMessage={handleValidationMessage}
                />
              </div>
              <button 
                onClick={handleGetStarted}
                disabled={!isValidZip}
                className="w-full md:w-auto md:max-w-[220px] md:mt-7 px-6 h-[60px] border-2 border-green-600 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 hover:border-green-700 disabled:bg-gray-400 disabled:border-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center md:whitespace-nowrap touch-target text-mobile-lg shadow-lg hover:shadow-xl hover:scale-105"
              >
                Get Started →
              </button>
            </div>
          </div>
        </div>


        {/* How It Works Section */}
        <section className="mb-16 lg:mb-24 py-20 lg:py-28 bg-gradient-to-br from-neutral-50 to-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl lg:text-5xl font-display font-bold text-neutral-900 mb-6">How It Works</h2>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">From preferences to groceries in three simple steps</p>
            </div>
          
            {/* Timeline Style Layout */}
            <div className="relative">
              {/* Connecting Line (Desktop) */}
              <div className="hidden lg:block absolute top-32 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
                <div className="flex justify-between items-center px-32">
                  <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                  <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-orange-500 rounded-full"></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-12 max-w-6xl mx-auto relative">
                {/* Step 1 - Preferences */}
                <div className="relative group">
                  {/* Large Step Number */}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white transition-colors duration-300">
                      <span className="text-2xl font-bold">1</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 pt-12 group-hover:-translate-y-2 min-h-[420px] flex flex-col">
                    {/* Mock UI Preview */}
                    <div className="mb-8 relative">
                      <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl p-6 border border-brand-200">
                        {/* Simulated form elements */}
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-brand-500 rounded-full"></div>
                            <div className="h-3 bg-neutral-200 rounded-full flex-1 max-w-32"></div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                            <div className="h-3 bg-neutral-200 rounded-full flex-1 max-w-28"></div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                            <div className="h-3 bg-neutral-200 rounded-full flex-1 max-w-36"></div>
                          </div>
                        </div>
                        <div className="text-xs text-brand-600 font-medium mt-4 text-center">Preference Setup</div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end">
                      <h3 className="text-xl font-display font-bold mb-4 text-neutral-800 group-hover:text-green-600 transition-colors">Tell Us Your Preferences</h3>
                      <p className="text-neutral-600 leading-relaxed">Quick 2-minute setup: dietary needs, family size, and weekly meal goals—we handle the rest.</p>
                    </div>
                  </div>
                </div>

                {/* Step 2 - Recipes */}
                <div className="relative group">
                  {/* Large Step Number */}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="w-16 h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white transition-colors duration-300">
                      <span className="text-2xl font-bold">2</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 pt-12 group-hover:-translate-y-2 min-h-[420px] flex flex-col">
                    {/* Mock Recipe Cards */}
                    <div className="mb-8">
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="w-full h-12 bg-gradient-to-br from-orange-200 to-orange-300 rounded mb-2"></div>
                            <div className="h-2 bg-neutral-200 rounded mb-1"></div>
                            <div className="h-2 bg-neutral-200 rounded w-3/4"></div>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="w-full h-12 bg-gradient-to-br from-blue-200 to-blue-300 rounded mb-2"></div>
                            <div className="h-2 bg-neutral-200 rounded mb-1"></div>
                            <div className="h-2 bg-neutral-200 rounded w-2/3"></div>
                          </div>
                        </div>
                        <div className="text-xs text-green-600 font-medium mt-4 text-center">Personalized Matches</div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end">
                      <h3 className="text-xl font-display font-bold mb-4 text-neutral-800 group-hover:text-emerald-600 transition-colors">Get Personalized Recipes</h3>
                      <p className="text-neutral-600 leading-relaxed">AI matches you with perfect meals from our curated recipes—all tailored to your diet, taste, and cooking skill level.</p>
                    </div>
                  </div>
                </div>

                {/* Step 3 - Shopping */}
                <div className="relative group">
                  {/* Large Step Number */}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="w-16 h-16 bg-orange-600 hover:bg-orange-700 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white transition-colors duration-300">
                      <span className="text-2xl font-bold">3</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 pt-12 group-hover:-translate-y-2 min-h-[420px] flex flex-col">
                    {/* Mock Shopping Cart */}
                    <div className="mb-8">
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2 bg-white rounded">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-green-200 rounded"></div>
                              <div>
                                <div className="h-2 bg-neutral-300 rounded w-16 mb-1"></div>
                                <div className="h-1.5 bg-neutral-200 rounded w-12"></div>
                              </div>
                            </div>
                            <div className="text-xs font-bold text-green-600">$4.99</div>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-orange-200 rounded"></div>
                              <div>
                                <div className="h-2 bg-neutral-300 rounded w-20 mb-1"></div>
                                <div className="h-1.5 bg-neutral-200 rounded w-16"></div>
                              </div>
                            </div>
                            <div className="text-xs font-bold text-green-600">$7.49</div>
                          </div>
                        </div>
                        <div className="text-xs text-orange-600 font-medium mt-4 text-center">Ready to Checkout</div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end">
                      <h3 className="text-xl font-display font-bold mb-4 text-neutral-800 group-hover:text-orange-600 transition-colors">Shop with One Click</h3>
                      <p className="text-neutral-600 leading-relaxed">Pre-built cart with exact quantities—just click checkout and get groceries delivered within hours.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Meal Images Showcase */}
        <MealShowcase />

        {/* Features */}
        <section className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 max-w-4xl mx-auto mobile-py lg:p-8 hover:shadow-xl transition-all duration-300">
          <h2 className="text-lg lg:text-2xl font-display font-bold text-center text-neutral-800 mb-6 lg:mb-8 text-mobile-lg">Why Choose ChefsCart?</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft touch-target">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-neutral-800 group-hover:text-brand-700 transition-colors duration-300 text-mobile-lg">Save 2+ Hours Weekly</h3>
                <p className="text-neutral-600 leading-relaxed text-mobile-base">Skip the meal planning struggle—get from "what's for dinner?" to ready-to-order cart in 5 minutes</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft touch-target">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <DollarSign className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-neutral-800 group-hover:text-brand-700 transition-colors duration-300 text-mobile-lg">Stop Food Waste</h3>
                <p className="text-neutral-600 leading-relaxed text-mobile-base">Perfect portions, exact quantities—never buy too much or run out of ingredients again</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft touch-target">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-neutral-800 group-hover:text-brand-700 transition-colors duration-300 text-mobile-lg">Personalized</h3>
                <p className="text-neutral-600 leading-relaxed text-mobile-base">Curated recipes filtered to match your dietary needs and preferences</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft touch-target">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <MapPin className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-neutral-800 group-hover:text-brand-700 transition-colors duration-300 text-mobile-lg">Local Availability</h3>
                <p className="text-neutral-600 leading-relaxed text-mobile-base">Ingredients matched to your local Instacart stores</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="mb-16 mt-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-center text-neutral-800 mb-12">What Our Users Say</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic flex-grow">
                  "I used to spend 2 hours every Sunday planning meals and making shopping lists. Now it takes me 5 minutes, and the recipes are actually better than what I picked myself!"
                </p>
                <div className="flex items-center mt-auto">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    S
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">Sarah Chen</p>
                    <p className="text-sm text-gray-500">Working Mom of 3</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic flex-grow">
                  "I was spending $200/week on takeout because meal planning felt impossible. ChefsCart cut my food budget in half and I'm eating way better meals."
                </p>
                <div className="flex items-center mt-auto">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    M
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">Marcus Rodriguez</p>
                    <p className="text-sm text-gray-500">Software Engineer</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic flex-grow">
                  "Perfect for my keto lifestyle! The meal plans are creative, the shopping is automatic, and I've saved hours every week."
                </p>
                <div className="flex items-center mt-auto">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    L
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">Lisa Thompson</p>
                    <p className="text-sm text-gray-500">Fitness Coach</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Grocery List Feature Section */}
        <section className="mb-16 mt-24">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-blue-200/50 shadow-xl">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
                    Already have a grocery list?
                  </h2>
                  <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                    Skip the meal planning and go straight to checkout. Paste any grocery list and we'll convert it to a ready-to-order Instacart cart in 30 seconds.
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span>Paste from notes, recipes, or type fresh</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span>AI recognizes every item automatically</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span>One-click checkout with Instacart</span>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/grocery-list')}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Try Grocery List →
                  </button>
                </div>
                <div className="relative">
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/30">
                    <div className="text-sm text-gray-500 mb-3">Your grocery list:</div>
                    <div className="space-y-2 text-gray-700 font-mono text-sm">
                      <div>5 bananas</div>
                      <div>2 lbs chicken breast</div>
                      <div>olive oil</div>
                      <div>3 cups rice</div>
                      <div>1 dozen eggs</div>
                      <div>bread</div>
                      <div>milk</div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">7 items</span>
                        <span className="text-green-600 font-semibold">Ready for checkout</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <div className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      30 sec
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section - only show if payment system is enabled */}
        {isPaymentSystemEnabled() && (
          <>
            <HomePricingSection />
            
            {/* Final CTA Section */}
            <section className="mb-16 mt-16">
              <div className="max-w-4xl mx-auto">
                <PricingCTA location="home_bottom" showFullFeatures={true} />
              </div>
            </section>
          </>
        )}

        {/* FAQ Section */}
        <section id="faq" className="mb-12 lg:mb-16 mt-16 lg:mt-24 -mx-4 px-4 py-12 lg:py-16 bg-white/40 backdrop-blur-sm border-y border-white/20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-display font-display font-bold text-center text-neutral-800 mb-8 lg:mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-0">
              {faqData.map((faq, index) => (
                <div key={index} className="border-b border-neutral-200 last:border-b-0">
                  <button
                    onClick={() => toggleFaqItem(index)}
                    className="w-full text-left flex items-center justify-between py-6 focus:outline-none hover:bg-neutral-50 transition-colors duration-200 touch-target"
                    aria-expanded={openFaqItems.has(index)}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <h3 className="text-mobile-lg font-medium text-neutral-700 pr-4 leading-relaxed">
                      {faq.question}
                    </h3>
                    <div className="flex-shrink-0 ml-4">
                      {openFaqItems.has(index) ? (
                        <Minus className="h-6 w-6 text-neutral-600 transition-transform duration-200" />
                      ) : (
                        <Plus className="h-6 w-6 text-neutral-600 transition-transform duration-200" />
                      )}
                    </div>
                  </button>
                  <div
                    id={`faq-answer-${index}`}
                    className={`overflow-hidden transition-all duration-300 ease-out ${
                      openFaqItems.has(index) 
                        ? 'max-h-96 opacity-100 pb-6' 
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="pr-8 lg:pr-12">
                      <div className="text-neutral-600 leading-relaxed text-mobile-base">
                        {faq.answer === 'table' ? (
                          <div className="space-y-4">
                            <p>A subscription is optional.</p>
                            <div className="overflow-x-auto mobile-safe">
                              <table className="w-full border-collapse border border-neutral-300 text-sm lg:text-base">
                                <thead>
                                  <tr className="bg-sage-50">
                                    <th className="border border-neutral-300 px-3 py-2 text-left font-semibold">Option</th>
                                    <th className="border border-neutral-300 px-3 py-2 text-left font-semibold">What you pay</th>
                                    <th className="border border-neutral-300 px-3 py-2 text-left font-semibold">Good for</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border border-neutral-300 px-3 py-2">Pay‑per‑order</td>
                                    <td className="border border-neutral-300 px-3 py-2">Delivery fee (~$3.99–$7.99), service fee (~5%), optional tip</td>
                                    <td className="border border-neutral-300 px-3 py-2">Occasional shoppers (≤ 2 orders/month)</td>
                                  </tr>
                                  <tr className="bg-sage-50">
                                    <td className="border border-neutral-300 px-3 py-2">Instacart+</td>
                                    <td className="border border-neutral-300 px-3 py-2">$9.99/mo or $99/yr, $0 delivery on $10+ orders (service fees still apply)</td>
                                    <td className="border border-neutral-300 px-3 py-2">Frequent shoppers (≥ 2 orders/month)</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <p>ChefsCart adds only a small concierge fee (free during beta). Everything else is Instacart's normal pricing.</p>
                          </div>
                        ) : faq.answer === 'list' ? (
                          <div className="space-y-2">
                            <p className="font-medium">Key differences:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li><strong>Unlimited choice</strong>: we pull from thousands of recipes instead of a fixed weekly menu.</li>
                              <li><strong>Flexible servings</strong>: adjust sliders for any number of eaters—no 2‑ or 4‑serving lock‑in.</li>
                              <li><strong>No subscription required</strong>: plan one week, skip the next, or run it on demand.</li>
                              <li><strong>Local pricing</strong>: items come from hundreds of Instacart retailers near you, so you're not paying national shipping mark‑ups.</li>
                              <li><strong>Same‑day delivery possible</strong>: if your store offers it, Instacart can get groceries to you in as little as two hours.</li>
                            </ul>
                          </div>
                        ) : (
                          <div dangerouslySetInnerHTML={{ 
                            __html: faq.answer
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\n/g, '<br />') 
                          }} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* View All FAQs and Still have questions footer */}
            <div className="text-center mt-8 space-y-6">
              <Link 
                href="/faq"
                className="inline-flex items-center px-6 py-3 bg-white hover:bg-neutral-50 border-2 border-brand-600 text-brand-600 hover:text-brand-700 font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                View All 22 FAQs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              
              <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl shadow-sm">
                <p className="text-neutral-700 font-medium mb-2">Still have questions?</p>
                <p className="text-neutral-600">
                  Email us at{' '}
                  <a 
                    href="mailto:support@chefscart.ai" 
                    className="text-brand-600 hover:text-brand-700 font-medium underline decoration-brand-300 hover:decoration-brand-500 transition-colors duration-200"
                  >
                    support@chefscart.ai
                  </a>
                  —we're happy to help!
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
