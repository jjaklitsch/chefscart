import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AmazonDisclaimerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Link>

          <h1 className="text-4xl font-display font-bold text-neutral-800 mb-8">
            Amazon Affiliate Disclosure & Disclaimer
          </h1>

          <div className="prose prose-lg max-w-none text-neutral-700">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-800 mb-4">
                FTC Disclosure Compliance
              </h2>
              <p className="mb-4">
                In accordance with the Federal Trade Commission's 16 CFR Part 255: "Guides Concerning the Use of 
                Endorsements and Testimonials in Advertising," we are required to disclose our relationship with Amazon.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-800 mb-4">
                Amazon Associates Program Participation
              </h2>
              <p className="mb-4">
                ChefsCart (chefscart.ai) is a participant in the Amazon Services LLC Associates Program, 
                an affiliate advertising program designed to provide a means for sites to earn advertising 
                fees by advertising and linking to Amazon.com, Amazon.ca, Amazon.co.uk, and other Amazon stores worldwide.
              </p>
              <p className="mb-4">
                As an Amazon Associate, we earn from qualifying purchases. This means that when you click on 
                certain links on our website and make a purchase, we may receive a small commission at no additional cost to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-800 mb-4">
                Product Recommendations
              </h2>
              <p className="mb-4">
                Our product recommendations are based on:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Compatibility with recipes in our meal planning database</li>
                <li>Customer reviews and ratings on Amazon</li>
                <li>Professional chef recommendations and industry standards</li>
                <li>Value for money and durability</li>
                <li>Popularity among home cooks and culinary professionals</li>
              </ul>
              <p className="mb-4">
                While we strive to recommend products we believe will be valuable to our users, 
                individual experiences may vary. We encourage you to read Amazon customer reviews 
                and do your own research before making purchase decisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-800 mb-4">
                Price and Availability Notice
              </h2>
              <p className="mb-4">
                Please note:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Prices displayed are fetched from Amazon and are subject to change without notice</li>
                <li>Product availability may vary based on your location and Amazon's current inventory</li>
                <li>Shipping costs and delivery times are determined by Amazon and may vary</li>
                <li>Product information is updated periodically but may not reflect real-time changes</li>
                <li>We are not responsible for price changes, availability, or any discrepancies between our site and Amazon's</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-800 mb-4">
                Data Accuracy and Updates
              </h2>
              <p className="mb-4">
                Product information displayed on ChefsCart, including prices, descriptions, and images, is obtained 
                through the Amazon Product Advertising API. While we strive to keep this information current:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Data is typically updated every 24 hours</li>
                <li>Real-time price changes on Amazon may not be immediately reflected</li>
                <li>Product specifications and features are provided by Amazon and manufacturers</li>
                <li>We display the timestamp of our last data update on each product</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-800 mb-4">
                Your Privacy
              </h2>
              <p className="mb-4">
                When you click on an Amazon link from our site:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>You will be redirected to Amazon.com</li>
                <li>Your interactions on Amazon are governed by Amazon's Privacy Policy</li>
                <li>We do not collect or store your Amazon purchase information</li>
                <li>Amazon may use cookies to track your session for attribution purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-800 mb-4">
                Disclaimer of Warranties
              </h2>
              <p className="mb-4">
                THE INFORMATION ON THIS WEBSITE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. 
                CHEFSCART DOES NOT WARRANT, GUARANTEE, OR MAKE ANY REPRESENTATIONS REGARDING THE USE, 
                OR THE RESULTS OF THE USE, OF THE AMAZON PRODUCTS LISTED ON THIS SITE.
              </p>
              <p className="mb-4">
                We are not responsible for:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Product defects or quality issues</li>
                <li>Shipping delays or damages</li>
                <li>Customer service issues with Amazon or third-party sellers</li>
                <li>Changes in product specifications or features</li>
                <li>Inaccuracies in product descriptions or images</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-800 mb-4">
                Contact Information
              </h2>
              <p className="mb-4">
                If you have questions about our Amazon affiliate relationship or product recommendations, 
                please contact us at:
              </p>
              <p className="mb-4">
                Email: support@chefscart.ai<br />
                Website: https://chefscart.ai
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-neutral-800 mb-4">
                Amazon Trademark
              </h2>
              <p className="mb-4 text-sm text-neutral-600">
                Amazon, Amazon.com, the Amazon logo, and other Amazon marks are trademarks of Amazon.com, Inc. or its affiliates. 
                ChefsCart is not affiliated with, endorsed by, or sponsored by Amazon.com, Inc. beyond our participation in the 
                Amazon Services LLC Associates Program.
              </p>
            </section>

            <div className="mt-12 p-6 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-sm text-green-800 mt-2">
                This disclosure is required by the Federal Trade Commission and Amazon.com, Inc. 
                By using our website and clicking on product links, you acknowledge that you have read and understood this disclosure.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}