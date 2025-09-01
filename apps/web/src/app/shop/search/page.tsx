'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { AmazonProduct, AmazonSearchResponse } from '../../../../types'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'
import AmazonProductCard from '../../../components/shop/AmazonProductCard'
import BackToTop from '../../../components/shop/BackToTop'
import AmazonDisclaimer from '../../../components/shop/AmazonDisclaimer'

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
                <AmazonProductCard
                  key={`${product.product_id}-${index}`}
                  product={product}
                  dataLastUpdated={new Date()}
                />
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

      <AmazonDisclaimer />
      <Footer />
      <BackToTop />
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