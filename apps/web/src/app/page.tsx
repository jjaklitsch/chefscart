"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat, MapPin, Clock, DollarSign, Plus, Minus, ShoppingCart, ArrowRight, CheckCircle } from 'lucide-react'
import ZipCodeInput from '../../components/ZipCodeInput'
import HeadlineABTest from '../../components/HeadlineABTest'
import Header from '../../components/Header'
import MealShowcase from '../../components/MealShowcase'
import Footer from '../../components/Footer'
import analytics from '../../lib/analytics'

export default function Home() {
  const [zipCode, setZipCode] = useState('')
  const [isValidZip, setIsValidZip] = useState(false)
  const [openFaqItems, setOpenFaqItems] = useState<Set<number>>(new Set())
  const router = useRouter()

  // Track page view with experiment context
  useEffect(() => {
    const userId = localStorage.getItem('chefscart_user_id') || '';
    analytics.trackPageView('landing', userId);
  }, []);

  const handleZipValidation = (zip: string, isValid: boolean) => {
    setZipCode(zip)
    setIsValidZip(isValid)
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
      question: "What is ChefsCart AI?",
      answer: "ChefsCart is an AI‑powered meal‑planning assistant that builds a fully shoppable Instacart cart in minutes. Tell us how many meals and servings you need, set any dietary goals, and we do the rest—recipes, portions, grocery selection, and a one‑tap checkout link."
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
      answer: "Absolutely. During onboarding you can choose styles like Vegan, Keto, Gluten‑Free, Low‑Carb, or add custom avoid‑lists (e.g., \"no peanuts, low‑sodium\"). The AI filters recipes and grocery picks to match."
    },
    {
      question: "What's the difference between meals and servings?",
      answer: "**Meals per week** = how many breakfasts, lunches, and dinners you want planned.\n**Servings** = how many plates each recipe should make (kids can be counted as ½‑serving).\nChefsCart uses those two numbers to size every ingredient before it reaches your cart—no math required on your end."
    },
    {
      question: "Can I get groceries without recipes?",
      answer: "Yes. After you confirm a plan you'll see an \"Add staples\" option where ChefsCart can auto‑add pantry items (milk, fruit, coffee, etc.) or you can type in extra items manually. They'll land in the same Instacart cart."
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
      question: "How much does ChefsCart itself cost?",
      answer: "ChefsCart is free during beta—you only pay Instacart's grocery total and delivery/service fees (or Instacart+ if you subscribe). A small concierge fee and optional premium tier will come later; beta users will receive founder discounts."
    },
    {
      question: "Can I change my meal plan after checkout?",
      answer: "If you want to tweak recipes before you build the cart, just hit \"Edit plan\" in ChefsCart. After the cart is created you can add or remove items directly inside Instacart before placing the order."
    },
    {
      question: "How do you protect my data?",
      answer: "We store only the preferences needed to generate your plan (diet, servings, ZIP) and your email if you create an account. Payment details stay with Stripe, and order details stay with Instacart. You can request data deletion anytime via support@chefscart.ai."
    }
  ]

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
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter your ZIP code"
                value={zipCode}
                onChange={(e) => {
                  const newZip = e.target.value.replace(/\D/g, '').slice(0, 5)
                  setZipCode(newZip)
                  if (newZip.length === 5) {
                    handleZipValidation(newZip, true) // Simplified for demo
                    setIsValidZip(true)
                  } else {
                    setIsValidZip(false)
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-500 rounded-lg focus:ring-0 transition-colors text-lg"
              />
            </div>
            <button 
              onClick={handleGetStarted}
              disabled={!isValidZip}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center whitespace-nowrap"
            >
              Get Started →
            </button>
          </div>
          {isValidZip && (
            <p className="text-green-700 text-sm flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Great! ChefsCart is available in your area.
            </p>
          )}
          {zipCode.length === 5 && !isValidZip && (
            <p className="text-red-600 text-sm">Please enter a valid ZIP code</p>
          )}
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
              <p className="text-neutral-600 leading-relaxed">Share your dietary needs, cooking skills, and meal preferences through our friendly chat wizard.</p>
            </div>
            <div className="card-unified text-center hover-lift transition-all duration-300 ease-out group">
              <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-brand border-2 border-brand-800 group-hover:scale-110 group-hover:shadow-brand-lg transition-all duration-300">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-display font-semibold mb-2 text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Get Personalized Recipes</h3>
              <p className="text-neutral-600 leading-relaxed">Our AI creates a custom meal plan with recipes tailored to your tastes and schedule.</p>
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
                <h3 className="font-display font-semibold mb-2 text-lg text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Smart Budgeting</h3>
                <p className="text-neutral-600 leading-relaxed">Get cost estimates and optimize for your budget preferences</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 group hover:bg-sage-100 p-4 rounded-xl transition-all duration-300 ease-out hover:shadow-soft">
              <div className="bg-brand-600 hover:bg-brand-700 rounded-full p-3 flex-shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <ChefHat className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-2 text-lg text-neutral-800 group-hover:text-brand-700 transition-colors duration-300">Personalized</h3>
                <p className="text-neutral-600 leading-relaxed">Recipes adapted to your dietary needs and cooking skill level</p>
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
