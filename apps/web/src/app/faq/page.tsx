"use client"

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

export default function FAQPage() {
  const [openFaqItems, setOpenFaqItems] = useState<Set<number>>(new Set())

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
      answer: "ChefsCart is currently free during our beta period. You only pay for groceries through Instacart—we never mark up food prices or charge additional fees."
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
    },
    {
      question: "How many recipes does ChefsCart have?",
      answer: "We have 500+ carefully curated recipes across all major cuisines and dietary styles. Our collection includes everything from 15-minute weeknight meals to elaborate weekend projects, all designed to work seamlessly with Instacart's ingredient availability."
    },
    {
      question: "Can I meal prep with ChefsCart?",
      answer: "Absolutely! Many of our recipes are designed for meal prep. You can filter for \"meal prep friendly\" recipes that reheat well, store properly, and can be prepared in batches. We'll scale ingredients accordingly if you want to make multiple servings for the week."
    },
    {
      question: "What if I don't like a recommended meal?",
      answer: "No problem! Every meal in your plan can be swapped with a single click. We'll suggest alternatives that match your dietary preferences and cooking difficulty level. You can swap as many meals as you want before creating your Instacart cart."
    },
    {
      question: "Do you offer vegetarian and vegan options?",
      answer: "Yes! We have extensive vegetarian and vegan recipe collections. During onboarding, you can specify your dietary preferences and we'll only suggest appropriate meals. We also clearly label plant-based protein sources and dairy-free alternatives."
    },
    {
      question: "Can I use ChefsCart for special occasions or holidays?",
      answer: "Yes! While we specialize in everyday meal planning, we have special occasion recipes for holidays, dinner parties, and celebrations. You can create custom meal plans for specific events and get all the ingredients delivered for your special meal."
    },
    {
      question: "What cooking skill level are the recipes designed for?",
      answer: "Our recipes range from beginner-friendly (15-minute meals, minimal ingredients) to intermediate (30-45 minutes, some techniques required) to challenging (complex flavors, multiple cooking methods). Each recipe is clearly labeled with difficulty level and estimated cooking time."
    },
    {
      question: "Can I get recipes for specific dietary restrictions?",
      answer: "Yes! We support all major dietary restrictions including gluten-free, dairy-free, nut-free, low-sodium, diabetic-friendly, and more. Simply specify your restrictions during onboarding and we'll filter out any recipes that don't meet your needs."
    }
  ]

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-neutral-800 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Everything you need to know about ChefsCart, from getting started to managing your meal plans.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 overflow-hidden">
          <div className="space-y-0">
            {faqData.map((faq, index) => (
              <div key={index} className="border-b border-neutral-200 last:border-b-0">
                <button
                  onClick={() => toggleFaqItem(index)}
                  className="w-full text-left flex items-center justify-between p-6 focus:outline-none hover:bg-neutral-50 transition-colors duration-200"
                  aria-expanded={openFaqItems.has(index)}
                  aria-controls={`faq-answer-${index}`}
                >
                  <h3 className="text-lg font-medium text-neutral-700 pr-4 leading-relaxed">
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
                  <div className="px-6">
                    <div className="text-neutral-600 leading-relaxed">
                      {faq.answer === 'table' ? (
                        <div className="space-y-4">
                          <p>A subscription is optional.</p>
                          <div className="overflow-x-auto">
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
                          <p>ChefsCart is currently free during our beta period.</p>
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
        </div>
        
        {/* Still have questions footer */}
        <div className="text-center mt-12 p-6 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl shadow-sm">
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
      
      <Footer />
    </div>
  )
}