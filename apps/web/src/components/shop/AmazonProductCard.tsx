'use client'

import { useState } from 'react'
import { ShoppingCart, Star, Info } from 'lucide-react'
import { AmazonProduct } from '../../../types'

interface AmazonProductCardProps {
  product: AmazonProduct
  compact?: boolean
  dataLastUpdated?: Date
}

export default function AmazonProductCard({ product, compact = false, dataLastUpdated }: AmazonProductCardProps) {
  const [showDataInfo, setShowDataInfo] = useState(false)

  const affiliateTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || 'chefscart-20'
  
  const generateAmazonUrl = () => {
    const asin = product.product_id
    return `https://www.amazon.com/dp/${asin}?tag=${affiliateTag}&linkCode=osi&th=1&psc=1`
  }

  const formatPrice = (price: string) => {
    if (!price || price === 'Price not available') return price
    if (price.match(/^\$\d+(\.\d{2})?/)) return price
    return price || 'Price not available'
  }

  const renderStars = (rating?: number) => {
    if (!rating) return null
    
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-3 h-3 fill-yellow-400/50 text-yellow-400" />)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-3 h-3 text-neutral-300" />)
    }

    return (
      <div className="flex items-center gap-1">
        {stars}
        {!compact && (
          <span className="text-xs text-neutral-600 ml-1">({rating.toFixed(1)})</span>
        )}
      </div>
    )
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on the info icon
    if ((e.target as HTMLElement).closest('.info-icon')) {
      return
    }
    window.open(generateAmazonUrl(), '_blank', 'noopener,noreferrer')
  }

  const formatUpdateTime = () => {
    if (!dataLastUpdated) return 'Recently updated'
    const now = new Date()
    const diff = now.getTime() - dataLastUpdated.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Updated less than 1 hour ago'
    if (hours < 24) return `Updated ${hours} hour${hours > 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `Updated ${days} day${days > 1 ? 's' : ''} ago`
  }

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white rounded-xl shadow-subtle hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer relative"
    >
      {/* Data Info Icon */}
      <button
        className="info-icon absolute top-2 right-2 z-10 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md transition-all"
        onClick={(e) => {
          e.stopPropagation()
          setShowDataInfo(!showDataInfo)
        }}
        aria-label="Product data information"
      >
        <Info className="h-4 w-4 text-neutral-600" />
      </button>

      {/* Data Info Tooltip */}
      {showDataInfo && (
        <div className="absolute top-10 right-2 z-20 bg-neutral-900 text-white text-xs rounded-lg p-3 shadow-lg w-48">
          <div className="font-semibold mb-1">Product Information</div>
          <div className="text-neutral-300">
            {formatUpdateTime()}
          </div>
          <div className="text-neutral-400 mt-1 text-[10px]">
            Prices and availability subject to change
          </div>
        </div>
      )}

      {/* Product Image */}
      <div className="aspect-square bg-neutral-50 overflow-hidden relative">
        {product.product_photos[0] ? (
          <img
            src={product.product_photos[0]}
            alt={product.product_title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart className="h-12 w-12 text-neutral-300" />
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className={compact ? "p-4" : "p-5"}>
        <h3 className={`font-semibold text-neutral-800 mb-2 line-clamp-2 group-hover:text-green-700 transition-colors ${compact ? 'text-sm' : ''}`}>
          {product.product_title}
        </h3>

        {product.brand && !compact && (
          <p className="text-xs text-neutral-500 mb-2">by {product.brand}</p>
        )}

        {product.rating && (
          <div className="mb-3">
            {renderStars(product.rating)}
            {!compact && product.review_count && (
              <span className="text-xs text-neutral-500 ml-1">
                ({product.review_count.toLocaleString()} reviews)
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className={`font-bold text-green-600 ${compact ? 'text-lg' : 'text-xl'}`}>
            {formatPrice(product.offer.price)}
          </div>
          <div className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1.5 flex items-center gap-1 transition-colors">
            <ShoppingCart className="h-3 w-3" />
            <span className="text-xs font-medium">Add to Cart</span>
          </div>
        </div>
      </div>
    </div>
  )
}