"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
      question: "Who handles support if something goes wrong with my order?",
      answer: "All order and delivery issues (missing items, substitutions, refunds, etc.) are processed directly by Instacart through Account › Orders › Help inside their app. For questions about meal plans, billing, or the ChefsCart site, email support@chefscart.ai."
    },
    {
      question: "Do I need an Instacart account?",
      answer: "Yes. Instacart requires you to log in or create a free account before checkout so they can store your address, payment card, and delivery preferences. The sign‑up takes about 30 seconds the first time you use ChefsCart."
    },
    {
      question: "Do I need an Instacart+ subscription, or can I just pay per order?",
      answer: "table"
    },
    {
      question: "Can ChefsCart handle special diets or allergies?",
      answer: "Absolutely. During onboarding you can choose dietary styles like Vegan, Keto, Gluten‑Free, Paleo, Mediterranean, and more. You can also specify foods to avoid (e.g., nuts, shellfish, dairy) and we'll filter recipes to match your needs."
    },
    {
      question: "What's the difference between meals and servings?",
      answer: "**Meals per week** = how many breakfasts, lunches, and dinners you want planned.\n**Servings** = how many plates each recipe should make (kids can be counted as ½‑serving).\nChefsCart uses those two numbers to size every ingredient before it reaches your cart—no math required on your end."
    },
    {
      question: "Can I customize my shopping cart?",
      answer: "Yes. After selecting your meals, you'll review a consolidated shopping list where you can adjust quantities, remove items you already have, and see exactly what will be added to your Instacart cart. You can also modify items directly in Instacart before checkout."
    },
    {
      question: "How is ChefsCart different from meal‑kit boxes like Blue Apron or Home Chef?",
      answer: "list"
    },
    {
      question: "Where is ChefsCart available?",
      answer: "Anywhere Instacart delivers in the United States and Canada. During signup we check your ZIP/postal code; if no local store is supported you can join our wait‑list and we'll notify you as soon as coverage expands."
    },
    {
      question: "How much does ChefsCart cost?",
      answer: "ChefsCart starts at $4.99/month (billed annually) or $5.99/month (billed monthly). Both plans include a free trial period with no commitment. You only pay for groceries through Instacart—we never mark up food prices."
    },
    {
      question: "Can I change my meal plan after creating the cart?",
      answer: "Before creating the cart, you can swap meals, adjust servings, and customize your shopping list in ChefsCart. After the cart is created, you can still add, remove, or modify items directly in Instacart before placing your order."
    },
    {
      question: "How do you protect my data?",
      answer: "We store only the preferences needed to generate your plan (diet, servings, ZIP) and your email if provided. We don't store payment information—all transactions are handled by Instacart. Your data is protected with industry-standard encryption. You can request data deletion anytime via support@chefscart.ai."
    },
    {
      question: "Can I choose a different store on Instacart?",
      answer: "Yes! When you land on Instacart, you can select from any available stores in your area at the top of the page. Popular options include Whole Foods, Kroger, Safeway, ALDI, and more. Prices and availability may vary by store. Pro tip: Some stores offer faster delivery or better prices for certain items."
    },
    {
      question: "What if an ingredient is out of stock?",
      answer: "Instacart handles substitutions automatically. You can set your substitution preferences (replace with similar item, specific replacement, or refund) for each item in your cart. The Instacart shopper will follow your preferences and may text you during shopping if they need clarification on replacements."
    },
    {
      question: "How accurate are the grocery quantities?",
      answer: "ChefsCart automatically scales all ingredients based on your serving size. For example, if a recipe serves 4 and you need 6 servings, we'll multiply all ingredients by 1.5x. The quantities are optimized for standard package sizes when possible (e.g., buying 2 lbs of chicken instead of 1.73 lbs)."
    },
    {
      question: "Can I save my favorite meals?",
      answer: "Yes! You can mark any meal as a favorite by clicking the heart icon. Your favorites are saved and you can easily access them when creating future meal plans. This helps ChefsCart learn your preferences and suggest similar recipes you might enjoy."
    },
    {
      question: "What's the best way to use ChefsCart?",
      answer: "**Weekly planning**: Set aside 5 minutes each weekend to plan your week's meals. **Start small**: Begin with 3-4 dinners if you're new to meal planning. **Use the swap feature**: Don't like a suggested meal? Swap it for another with one click. **Check your pantry**: Mark items you already have to avoid buying duplicates. **Schedule delivery**: Pick a delivery time when you'll be home to ensure freshness."
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
    <div className="min-h-screen bg-health-gradient">
      <Header />
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <header className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <ShoppingCart className="h-12 w-12 text-brand-600 mr-3" />
            <h1 className="text-4xl font-display font-bold text-neutral-800">ChefsCart</h1>
          </div>
          <HeadlineABTest className="text-center" />
        </header>

        {/* ZIP Code Section */}
        <div className="max-w-lg mx-auto mb-16 animate-slide-up">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <ZipCodeInput 
                onZipValidation={handleZipValidation}
                onSubmit={handleGetStarted}
                showFullWidthMessage={false}
                onValidationMessage={handleValidationMessage}
              />
            </div>
            <button 
              onClick={handleGetStarted}
              disabled={!isValidZip}
              className="w-full sm:w-auto sm:mt-7 px-6 h-[60px] border-2 border-green-600 bg-green-600 text-white text-lg font-medium rounded-xl hover:bg-green-700 hover:border-green-700 disabled:bg-gray-400 disabled:border-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center sm:whitespace-nowrap"
            >
              Get Started →
            </button>
          </div>
          
          {/* Note: Validation message is handled by ZipCodeInput since showFullWidthMessage={false} */}
        </div>


        {/* How It Works Section */}
        <section className="mb-16 -mx-4 px-4 py-16 bg-white/50 backdrop-blur-sm border-y border-white/30">
          <h2 className="text-3xl font-display font-bold text-center text-neutral-800 mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            <div className="card-unified text-center hover-lift transition-all duration-300 ease-out group">
              <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-brand border-2 border-brand-700 group-hover:scale-110 group-hover:shadow-brand-lg transition-all duration-300">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-display font-semibold mb-2 text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Tell Us Your Preferences</h3>
              <p className="text-neutral-600 leading-relaxed">Set your dietary needs, servings, and weekly meal count through our guided step-by-step process.</p>
            </div>
            <div className="card-unified text-center hover-lift transition-all duration-300 ease-out group">
              <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-brand border-2 border-brand-800 group-hover:scale-110 group-hover:shadow-brand-lg transition-all duration-300">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-display font-semibold mb-2 text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Get Personalized Recipes</h3>
              <p className="text-neutral-600 leading-relaxed">Receive a custom meal plan with recipes matched to your dietary needs and preferences from our curated collection.</p>
            </div>
            <div className="card-unified text-center hover-lift transition-all duration-300 ease-out group">
              <div className="bg-gradient-to-br from-brand-700 to-brand-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-brand border-2 border-brand-900 group-hover:scale-110 group-hover:shadow-brand-lg transition-all duration-300">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-display font-semibold mb-2 text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Shop with One Click</h3>
              <p className="text-neutral-600 leading-relaxed">Review your cart and checkout directly through Instacart with all ingredients ready to order.</p>
            </div>
          </div>
        </section>

        {/* Meal Images Showcase */}
        <MealShowcase />

        {/* Features */}
        <section className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 max-w-4xl mx-auto p-8 hover:shadow-xl transition-all duration-300">
          <h2 className="text-2xl font-display font-bold text-center text-neutral-800 mb-8">Why Choose ChefsCart?</h2>
          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-lg text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Save Time</h3>
                <p className="text-neutral-600 leading-relaxed">From meal planning to shopping cart in under 5 minutes</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-lg text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Smart Shopping</h3>
                <p className="text-neutral-600 leading-relaxed">Ingredients consolidated and scaled to avoid waste and save money</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-lg text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Personalized</h3>
                <p className="text-neutral-600 leading-relaxed">500+ recipes filtered to match your dietary needs and preferences</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-lg text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Local Availability</h3>
                <p className="text-neutral-600 leading-relaxed">Ingredients matched to your local Instacart stores</p>
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
                  "ChefsCart turned my chaotic meal planning into a 5-minute task. The AI actually understands my dietary restrictions and creates meals my whole family loves."
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
                  "As a busy professional, I was ordering takeout 5 nights a week. ChefsCart helps me cook healthy meals at home without the planning stress."
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
        <section id="faq" className="mb-16 mt-24 -mx-4 px-4 py-16 bg-white/40 backdrop-blur-sm border-y border-white/20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-center text-neutral-800 mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-0">
              {faqData.map((faq, index) => (
                <div key={index} className="border-b border-neutral-200 last:border-b-0">
                  <button
                    onClick={() => toggleFaqItem(index)}
                    className="w-full text-left flex items-center justify-between py-6 focus:outline-none hover:bg-neutral-50 transition-colors duration-200"
                    aria-expanded={openFaqItems.has(index)}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <h3 className="text-lg font-medium text-neutral-700 pr-4">
                      {faq.question}
                    </h3>
                    <div className="flex-shrink-0">
                      {openFaqItems.has(index) ? (
                        <Minus className="h-5 w-5 text-neutral-600 transition-transform duration-200" />
                      ) : (
                        <Plus className="h-5 w-5 text-neutral-600 transition-transform duration-200" />
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
                    <div className="pr-12">
                      <div className="text-neutral-600 leading-relaxed">
                        {faq.answer === 'table' ? (
                          <div className="space-y-4">
                            <p>A subscription is optional.</p>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-neutral-300 text-sm">
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
            
            {/* Still have questions footer */}
            <div className="text-center mt-8 p-6 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl shadow-sm">
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
        </section>
      </div>
      <Footer />
    </div>
  );
}
