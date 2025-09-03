import Link from 'next/link'

export default function AmazonDisclaimer() {
  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 pt-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-neutral-800 leading-relaxed">
            <strong>Affiliate Disclosure:</strong> ChefsCart is a participant in the Amazon Services LLC Associates Program, 
            an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com. 
            When you click on product links and make a purchase, we may earn a commission at no additional cost to you. 
            This helps support our mission to bring you the best cooking resources and recommendations. 
            Prices and availability are subject to change.{' '}
            <Link href="/disclaimer" className="underline hover:text-green-600 transition-colors text-green-600">
              Learn more
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}