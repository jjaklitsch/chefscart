import { ChefHat } from 'lucide-react'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

export const metadata = {
  title: 'Privacy Policy - ChefsCart',
  description: 'Learn how ChefsCart protects and handles your personal information and data.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-health-gradient">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="card-unified p-8 lg:p-12">
            <h1 className="text-4xl font-display font-bold text-neutral-800 mb-8">Privacy Policy</h1>
            
            <div className="prose prose-neutral max-w-none">
              <p className="text-lg text-neutral-600 mb-8">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">1. Information We Collect</h2>
                <p className="text-neutral-600 leading-relaxed mb-4">
                  We collect information you provide directly to us, such as when you create an account, 
                  use our meal planning service, or contact us for support.
                </p>
                <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                  <li>Personal information (name, email address, ZIP code)</li>
                  <li>Dietary preferences and restrictions</li>
                  <li>Meal planning preferences and history</li>
                  <li>Usage data and analytics</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">2. How We Use Your Information</h2>
                <p className="text-neutral-600 leading-relaxed mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                  <li>Provide personalized meal planning services</li>
                  <li>Generate custom recipes and shopping lists</li>
                  <li>Improve our AI recommendations</li>
                  <li>Send service-related communications</li>
                  <li>Analyze usage patterns to enhance our service</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">3. Information Sharing and Disclosure</h2>
                <p className="text-neutral-600 leading-relaxed mb-4">
                  We do not sell, trade, or rent your personal information to third parties. 
                  We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                  <li>With Instacart to facilitate grocery shopping (shopping lists only)</li>
                  <li>With service providers who assist in operating our platform</li>
                  <li>When required by law or to protect our rights</li>
                  <li>With your explicit consent</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">4. Data Security</h2>
                <p className="text-neutral-600 leading-relaxed">
                  We implement appropriate security measures to protect your personal information 
                  against unauthorized access, alteration, disclosure, or destruction. However, 
                  no method of transmission over the internet is 100% secure.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">5. Your Rights</h2>
                <p className="text-neutral-600 leading-relaxed mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                  <li>Access and update your personal information</li>
                  <li>Delete your account and associated data</li>
                  <li>Opt out of marketing communications</li>
                  <li>Request a copy of your data</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">6. Contact Us</h2>
                <p className="text-neutral-600 leading-relaxed">
                  If you have any questions about this Privacy Policy, please contact us at{' '}
                  <a 
                    href="mailto:support@chefscart.ai" 
                    className="text-brand-600 hover:text-brand-700 font-medium underline decoration-brand-300 hover:decoration-brand-500 transition-colors duration-200"
                  >
                    support@chefscart.ai
                  </a>
                </p>
              </section>
            </div>

            <div className="mt-12 pt-8 border-t border-neutral-200">
              <Link 
                href="/" 
                className="inline-flex items-center text-brand-600 hover:text-brand-700 font-medium transition-colors duration-200"
              >
                <ChefHat className="h-4 w-4 mr-2" />
                Back to ChefsCart
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}