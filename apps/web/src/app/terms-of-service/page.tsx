import { ChefHat } from 'lucide-react'
import Link from 'next/link'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'

export const metadata = {
  title: 'Terms of Service - ChefsCart',
  description: 'Terms and conditions for using the ChefsCart meal planning service.',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-health-gradient">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="card-unified p-8 lg:p-12">
            <h1 className="text-4xl font-display font-bold text-neutral-800 mb-8">Terms of Service</h1>
            
            <div className="prose prose-neutral max-w-none">
              <p className="text-lg text-neutral-600 mb-8">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">1. Acceptance of Terms</h2>
                <p className="text-neutral-600 leading-relaxed">
                  By accessing and using ChefsCart, you accept and agree to be bound by the terms 
                  and provision of this agreement. If you do not agree to abide by the above, 
                  please do not use this service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">2. Description of Service</h2>
                <p className="text-neutral-600 leading-relaxed mb-4">
                  ChefsCart is an AI-powered meal planning service that:
                </p>
                <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                  <li>Creates personalized meal plans based on your preferences</li>
                  <li>Generates shopping lists compatible with Instacart</li>
                  <li>Provides recipe recommendations and dietary guidance</li>
                  <li>Facilitates grocery shopping through third-party services</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">3. User Responsibilities</h2>
                <p className="text-neutral-600 leading-relaxed mb-4">
                  You agree to:
                </p>
                <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                  <li>Provide accurate information about dietary preferences and restrictions</li>
                  <li>Use the service only for lawful purposes</li>
                  <li>Not attempt to interfere with the service's operation</li>
                  <li>Respect intellectual property rights</li>
                  <li>Not share your account credentials with others</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">4. Third-Party Services</h2>
                <p className="text-neutral-600 leading-relaxed">
                  ChefsCart integrates with third-party services like Instacart for grocery shopping. 
                  Your use of these services is subject to their respective terms of service. 
                  We are not responsible for the availability, content, or policies of third-party services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">5. Pricing and Payment</h2>
                <p className="text-neutral-600 leading-relaxed mb-4">
                  ChefsCart is currently free during our beta period. Future pricing will be 
                  communicated in advance. You are responsible for:
                </p>
                <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                  <li>All grocery costs through third-party retailers</li>
                  <li>Delivery fees charged by grocery services</li>
                  <li>Any applicable taxes</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">6. Disclaimers</h2>
                <p className="text-neutral-600 leading-relaxed mb-4">
                  ChefsCart provides meal planning suggestions and recommendations. We are not responsible for:
                </p>
                <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                  <li>Dietary advice or nutritional accuracy</li>
                  <li>Food allergies or adverse reactions</li>
                  <li>Grocery delivery issues or product quality</li>
                  <li>Recipe outcomes or cooking results</li>
                </ul>
                <p className="text-neutral-600 leading-relaxed mt-4">
                  Always consult with healthcare professionals for dietary advice, especially 
                  if you have food allergies or medical conditions.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">7. Limitation of Liability</h2>
                <p className="text-neutral-600 leading-relaxed">
                  ChefsCart shall not be liable for any indirect, incidental, special, 
                  consequential, or punitive damages resulting from your use of the service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">8. Termination</h2>
                <p className="text-neutral-600 leading-relaxed">
                  We may terminate or suspend your account and access to the service at our 
                  sole discretion, without prior notice, for conduct that we believe violates 
                  these Terms of Service or is harmful to other users, us, or third parties.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">9. Changes to Terms</h2>
                <p className="text-neutral-600 leading-relaxed">
                  We reserve the right to modify these terms at any time. We will notify users 
                  of significant changes via email or through the service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-display font-semibold text-neutral-800 mb-4">10. Contact Information</h2>
                <p className="text-neutral-600 leading-relaxed">
                  If you have any questions about these Terms of Service, please contact us at{' '}
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