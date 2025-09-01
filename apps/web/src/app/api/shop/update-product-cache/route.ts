import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { searchAmazonProducts } from '../../../../../lib/amazon-api';
import { CookingEquipment } from '../../../../../types';

/**
 * Update Product Cache API Route
 * 
 * POST /api/shop/update-product-cache
 * 
 * This endpoint fetches Amazon product data for cooking equipment and stores it in the database.
 * It's designed to be called by a cron job to keep product data fresh.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron authentication
    const cronSecret = request.headers.get('authorization');
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role key for admin operations
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get all cooking equipment with their search terms
    const { data: equipment, error: equipmentError } = await supabase
      .from('cooking_equipment')
      .select('id, display_name, amazon_search_terms, popularity_score')
      .order('popularity_score', { ascending: false })
    
    const typedEquipment = equipment as CookingEquipment[]
    
    if (equipmentError) {
      throw new Error(`Failed to fetch equipment: ${equipmentError.message}`)
    }

    const results: Array<{
      equipment: string
      searchTerm?: string
      productsFound?: number
      success: boolean
      error?: string
    }> = []
    let totalUpdated = 0
    let totalErrors = 0

    // Process equipment in batches to avoid rate limiting
    const batchSize = 5
    for (let i = 0; i < typedEquipment.length; i += batchSize) {
      const batch = typedEquipment.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async (item) => {
        try {
          const primarySearchTerm = item.amazon_search_terms[0] || item.display_name
          
          // Search Amazon for products
          const searchResult = await searchAmazonProducts({
            keywords: primarySearchTerm,
            itemCount: 10,
            searchIndex: 'All'
          })

          // Process and store each product
          const products = searchResult.products.slice(0, 10).map((product, index) => ({
            asin: product.product_id,
            equipment_id: item.id,
            search_term: primarySearchTerm,
            product_title: product.product_title,
            product_url: product.product_page_url,
            brand: product.brand || null,
            price: product.offer.price,
            currency: 'USD',
            in_stock: true,
            primary_image_url: product.product_photos[0] || null,
            additional_image_urls: product.product_photos.slice(1),
            rating: product.rating || null,
            review_count: product.review_count || null,
            features: [], // Amazon API doesn't provide detailed features in search results
            description: null, // Would need individual product API calls
            amazon_categories: [], // Not available in search results
            popularity_rank: index + 1,
            display_priority: index + 1,
            is_active: true,
            last_updated: new Date().toISOString()
          }))

          // Upsert products into database
          for (const productData of products) {
            const { error: upsertError } = await supabase
              .from('amazon_products')
              .upsert(productData as any, {
                onConflict: 'asin',
                ignoreDuplicates: false
              })

            if (upsertError) {
              console.error(`Error upserting product ${productData.asin}:`, upsertError)
              totalErrors++
            } else {
              totalUpdated++
            }
          }

          results.push({
            equipment: item.display_name,
            searchTerm: primarySearchTerm,
            productsFound: products.length,
            success: true
          })

        } catch (error) {
          console.error(`Error processing equipment ${item.display_name}:`, error)
          totalErrors++
          results.push({
            equipment: item.display_name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }))

      // Add delay between batches to respect rate limits
      if (i + batchSize < typedEquipment.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Refresh the materialized view
    try {
      await supabase.rpc('refresh_product_cache')
    } catch (error) {
      console.error('Error refreshing product cache view:', error)
    }

    return NextResponse.json({
      success: true,
      data: {
        equipmentProcessed: typedEquipment.length,
        totalProductsUpdated: totalUpdated,
        totalErrors: totalErrors,
        results: results,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Product cache update error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'PRODUCT_CACHE_UPDATE_ERROR'
        }
      },
      { status: 500 }
    )
  }
}

/**
 * Manual trigger endpoint (for testing)
 * GET /api/shop/update-product-cache
 */
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Manual trigger only available in development' },
      { status: 403 }
    )
  }

  // Simulate cron request
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${process.env.CRON_SECRET}`
    }
  })

  return POST(mockRequest)
}