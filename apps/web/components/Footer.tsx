import { ChefHat, Mail } from 'lucide-react'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-neutral-50 to-sage-50 border-t border-neutral-200 mt-24">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-lg p-2 shadow-brand">
                <ChefHat className="h-6 w-6 text-white" />
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

          {/* Social Media Placeholders */}
          <div>
            <h3 className="font-display font-semibold text-neutral-800 mb-4">Connect</h3>
            <div className="space-y-3">
              <p className="text-neutral-600 text-sm">
                Follow us for recipes, tips, and updates
              </p>
              <div className="flex space-x-3">
                {/* Placeholder social icons - to be implemented later */}
                <div className="w-8 h-8 bg-neutral-200 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-neutral-400 rounded"></div>
                </div>
                <div className="w-8 h-8 bg-neutral-200 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-neutral-400 rounded"></div>
                </div>
                <div className="w-8 h-8 bg-neutral-200 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-neutral-400 rounded"></div>
                </div>
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