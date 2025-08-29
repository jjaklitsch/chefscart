import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Create Supabase client with connection pooling optimizations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false, // Disable session persistence for API routes
    },
  }
)

export async function POST(request: NextRequest) {
  try {
    const { zipCode } = await request.json()

    // Validate ZIP code format
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({
        isValid: false,
        hasInstacartCoverage: false,
        message: 'Please enter a valid 5-digit ZIP code'
      }, { status: 400 })
    }


    // Optimized cache query - select only needed fields and use single query
    const { data: cachedData, error: cacheError } = await supabase
      .from('zip_code_cache')
      .select('is_valid, has_instacart_coverage, retailer_count, last_updated, city, state')
      .eq('zip_code', zipCode)
      .maybeSingle() // Use maybeSingle instead of single to avoid errors

    if (cacheError) {
      console.error('Cache lookup error:', cacheError)
    }

    // Check if we have fresh cache data (less than 30 days old)
    const isCacheValid = cachedData && 
      new Date(cachedData.last_updated) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    if (isCacheValid) {
      
      return NextResponse.json({
        isValid: cachedData.is_valid,
        hasInstacartCoverage: cachedData.has_instacart_coverage,
        city: cachedData.city,
        state: cachedData.state,
        message: cachedData.has_instacart_coverage 
          ? "Great! ChefsCart is available in your area."
          : "ChefsCart isn't available in your area yet.",
        source: 'optimized_cache',
        cacheAge: Math.floor((Date.now() - new Date(cachedData.last_updated).getTime()) / (24 * 60 * 60 * 1000))
      })
    }


    // Fallback to live API call (same as original)
    const apiKey = process.env.INSTACART_API_KEY
    
    if (!apiKey) {
      console.warn('INSTACART_API_KEY not configured, allowing all ZIP codes')
      return NextResponse.json({
        isValid: true,
        hasInstacartCoverage: true,
        message: 'Great! ChefsCart is available in your area.',
        source: 'fallback_no_key'
      })
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // Reduced timeout
      
      const instacartResponse = await fetch(
        `${process.env.INSTACART_IDP_BASE_URL}/idp/v1/retailers?postal_code=${zipCode}&country_code=US`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }
      )
      
      clearTimeout(timeoutId)

      let hasInstacartCoverage = false
      let retailerCount = 0

      if (instacartResponse.ok) {
        const data = await instacartResponse.json()
        hasInstacartCoverage = data.retailers && data.retailers.length > 0
        retailerCount = data.retailers?.length || 0
      } else if (instacartResponse.status === 404) {
        hasInstacartCoverage = false // No coverage
      } else {
        throw new Error(`HTTP ${instacartResponse.status}`)
      }

      // Cache the result for future requests - fire and forget to avoid blocking response
      supabase
        .from('zip_code_cache')
        .upsert({
          zip_code: zipCode,
          is_valid: true,
          has_instacart_coverage: hasInstacartCoverage,
          retailer_count: retailerCount,
          last_updated: new Date().toISOString(),
          last_api_check: new Date().toISOString(),
          api_response_status: instacartResponse.status
        })
        .then(() => console.log(`💾 Cached result for ZIP ${zipCode}`))
        .catch((err) => console.error('Error caching result:', err))

      return NextResponse.json({
        isValid: true,
        hasInstacartCoverage,
        message: hasInstacartCoverage 
          ? "Great! ChefsCart is available in your area."
          : "ChefsCart isn't available in your area yet.",
        source: 'api',
        retailerCount
      })

    } catch (apiError) {
      console.error('API error:', apiError)
      
      // If we have stale cache data, use it as fallback
      if (cachedData) {
        
        return NextResponse.json({
          isValid: cachedData.is_valid,
          hasInstacartCoverage: cachedData.has_instacart_coverage,
          city: cachedData.city,
          state: cachedData.state,
          message: cachedData.has_instacart_coverage 
            ? `Great! ChefsCart is available in your area.`
            : "ChefsCart isn't available in your area yet.",
          source: 'stale_cache',
          warning: 'Using cached data due to API issues'
        })
      }
      
      // Final fallback - be optimistic
      return NextResponse.json({
        isValid: true,
        hasInstacartCoverage: true,
        message: 'Great! ChefsCart is available in your area.',
        source: 'fallback_optimistic',
        warning: 'Could not verify coverage, assuming available'
      })
    }

  } catch (error) {
    console.error('ZIP validation error:', error)
    return NextResponse.json({
      isValid: false,
      hasInstacartCoverage: false,
      message: 'Error validating ZIP code',
      source: 'error'
    }, { status: 500 })
  }
}