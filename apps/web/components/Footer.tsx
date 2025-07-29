import { ShoppingCart, Mail, Instagram, Youtube } from 'lucide-react'
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
  return (
    <footer className="bg-gradient-to-br from-neutral-50 to-sage-50 border-t border-neutral-200 mt-24">
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

          {/* Quick Links */}
          <div>
            <h3 className="font-display font-semibold text-neutral-800 mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/grocery-list" 
                  className="text-neutral-600 hover:text-brand-700 transition-colors duration-200"
                >
                  AI Grocery List
                </Link>
              </li>
              <li>
                <Link 
                  href="#faq" 
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
              © 2024 ChefsCart. All rights reserved.
            </p>
            <p className="text-neutral-500 text-sm mt-2 sm:mt-0">
              Made with care for your kitchen
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}