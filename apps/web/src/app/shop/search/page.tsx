'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, ExternalLink, ShoppingCart, Star, Filter } from 'lucide-react'
import Link from 'next/link'
import { AmazonProduct, AmazonSearchResponse } from '../../../../types'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'

function ShopSearchContent() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams?.get('q') || '')
  const [products, setProducts] = useState<AmazonProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    category: 'All',
    minPrice: '',
    maxPrice: '',
    brand: ''
  })
  const loadingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initialQuery = searchParams?.get('q')
    if (initialQuery) {
      setQuery(initialQuery)
      performSearch(initialQuery, 1)
    }
  }, [searchParams])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && hasMore && !loading && query.trim()) {
          performSearch(query, currentPage + 1, true)
        }
      },
      {
        rootMargin: '100px', // Trigger 100px before reaching the element
        threshold: 0.1
      }
    )

    if (loadingRef.current) {
      observer.observe(loadingRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, currentPage, query])

  const performSearch = async (searchQuery: string, page: number = 1, loadMore: boolean = false) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        page: page.toString(),
        count: '10',
        category: filters.category
      })

      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
      if (filters.brand) params.append('brand', filters.brand)

      const response = await fetch(`/api/amazon/search?${params}`)
      const data: AmazonSearchResponse = await response.json()

      if (data.success && data.data) {
        const newProducts = data.data.products

        if (loadMore) {
          setProducts(prev => [...prev, ...newProducts])
        } else {
          setProducts(newProducts)
        }

        setCurrentPage(data.data.pagination.currentPage)
        setHasMore(data.data.pagination.hasNextPage)
        setTotalResults(data.data.pagination.totalResults)
      } else {
        setError(data.error?.message || 'Search failed')
        if (!loadMore) {
          setProducts([])
        }
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search products. Please try again.')
      if (!loadMore) {
        setProducts([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      // Update URL
      window.history.pushState({}, '', `/shop/search?q=${encodeURIComponent(query.trim())}`)
      performSearch(query.trim(), 1)
    }
  }, [query, filters])


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const generateAmazonCartUrl = (product: AmazonProduct) => {
    const asin = product.product_id
    const affiliateId = 'chefscart-20'
    return `https://www.amazon.com/dp/${asin}?tag=${affiliateId}&linkCode=osi&th=1&psc=1`
  }

  const formatPrice = (price: string) => {
    // Clean up price formatting from Amazon but preserve currency symbol
    if (!price || price === 'Price not available') return price
    // If price already looks good (starts with $ and has reasonable format), return as-is
    if (price.match(/^\$\d+(\.\d{2})?/)) return price
    // Otherwise try to extract just the price part while keeping the $ if present
    return price || 'Price not available'
  }

  const renderStars = (rating?: number) => {
    if (!rating) return null
    
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-neutral-300" />)
    }

    return (
      <div className="flex items-center gap-1">
        {stars}
        <span className="text-sm text-neutral-600 ml-1">({rating.toFixed(1)})</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
      <Header />
      {/* Search Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-display font-bold text-neutral-800 mb-6">
              ChefsCart Product Search
            </h1>
            
            {/* Search Bar */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search for cooking equipment..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5" />
              </div>
              <button
                onClick={handleSearch}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Search
              </button>
            </div>

            {/* Results Summary */}
            {totalResults > 0 && (
              <div className="text-neutral-600">
                Found <strong>{totalResults.toLocaleString()}</strong> results for "{query}"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product, index) => (
                <div
                  key={`${product.product_id}-${index}`}
                  className="bg-white rounded-2xl shadow-subtle hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-neutral-100 overflow-hidden">
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
                        <ShoppingCart className="h-16 w-16 text-neutral-300" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-6">
                    <h3 className="font-semibold text-neutral-800 mb-2 line-clamp-2 group-hover:text-green-700 transition-colors">
                      {product.product_title}
                    </h3>

                    {product.brand && (
                      <p className="text-sm text-neutral-500 mb-2">by {product.brand}</p>
                    )}

                    {product.rating && (
                      <div className="mb-3">
                        {renderStars(product.rating)}
                        {product.review_count && (
                          <span className="text-xs text-neutral-500 ml-2">
                            ({product.review_count.toLocaleString()} reviews)
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mb-6">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPrice(product.offer.price)}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <a
                        href={generateAmazonCartUrl(product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Buy on Amazon
                      </a>
                      <a
                        href={product.product_page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on Amazon
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Infinite Scroll Loading Indicator */}
          {hasMore && products.length > 0 && (
            <div ref={loadingRef} className="text-center mt-12 py-8">
              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
                  <p className="text-neutral-600 text-sm">Loading more products...</p>
                </div>
              ) : (
                <div className="h-8"> {/* Placeholder to maintain consistent height */}
                  <p className="text-neutral-400 text-sm">Scroll for more products</p>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && products.length === 0 && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-neutral-600">Searching Amazon for products...</p>
            </div>
          )}

          {/* No Results */}
          {!loading && products.length === 0 && query && !error && (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-neutral-800 mb-2">No products found</h3>
              <p className="text-neutral-600 mb-6">
                Try adjusting your search terms or browse our categories
              </p>
              <Link
                href="/shop"
                className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors inline-block"
              >
                Browse Categories
              </Link>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default function ShopSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-sage-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading search...</p>
          </div>
        </div>
        <Footer />
      </div>
    }>
      <ShopSearchContent />
    </Suspense>
  )
}