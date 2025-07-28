"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat, MapPin, Clock, DollarSign, Plus, Minus } from 'lucide-react'
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
            <ChefHat className="h-12 w-12 text-brand-600 mr-3" />
            <h1 className="text-4xl font-display font-bold text-neutral-800">ChefsCart</h1>
          </div>
          <HeadlineABTest className="text-center" />
        </header>

        {/* ZIP Code Section */}
        <div className="max-w-md mx-auto mb-16 animate-slide-up">
          <ZipCodeInput onZipValidation={handleZipValidation} />
          {isValidZip && (
            <button 
              onClick={handleGetStarted}
              className="btn-primary-new w-full mt-4 animate-bounce-gentle"
            >
              Get Started →
            </button>
          )}
        </div>

        {/* How It Works Section */}
        <section className="mb-16">
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
        <section className="card-hero max-w-4xl mx-auto hover-lift">
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

        {/* FAQ Section */}
        <section id="faq" className="mb-16 mt-24">
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
            <div className="text-center mt-12 p-6 bg-gradient-to-br from-sage-50 to-cream-50 border border-sage-200 rounded-xl">
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
