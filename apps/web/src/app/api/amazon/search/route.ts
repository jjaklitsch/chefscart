import { NextRequest, NextResponse } from 'next/server';
import { searchAmazonProducts, type SearchParams } from '../../../../../lib/amazon-api';

/**
 * Amazon Product Search API Route
 * 
 * GET /api/amazon/search?q=search+term&page=1&count=10
 * 
 * Query Parameters:
 * - q (required): Search keywords
 * - page: Page number (default: 1)
 * - count: Items per page (default: 10, max: 10)
 * - category: Amazon search index (default: 'All')
 * - minPrice: Minimum price filter
 * - maxPrice: Maximum price filter
 * - brand: Brand filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract and validate parameters
    const query = searchParams.get('q');
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const count = Math.min(10, Math.max(1, parseInt(searchParams.get('count') || '10')));
    const category = searchParams.get('category') || 'All';
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const brand = searchParams.get('brand') || undefined;

    // Build search parameters
    const searchParamsObj: SearchParams = {
      keywords: query,
      itemPage: page,
      itemCount: count,
      searchIndex: category,
      ...(minPrice !== undefined && { minPrice }),
      ...(maxPrice !== undefined && { maxPrice }),
      ...(brand && { brand })
    };

    // Perform Amazon API search
    const result = await searchAmazonProducts(searchParamsObj);

    // Return structured response
    return NextResponse.json({
      success: true,
      data: {
        products: result.products,
        pagination: {
          currentPage: page,
          itemsPerPage: count,
          totalResults: result.totalResults,
          hasNextPage: page * count < result.totalResults
        },
        searchUrl: result.searchUrl,
        query: {
          keywords: query,
          category,
          filters: {
            minPrice,
            maxPrice,
            brand
          }
        }
      }
    });

  } catch (error) {
    console.error('Amazon search API error:', error);
    
    // Return structured error response
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'AMAZON_API_ERROR'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Get available Amazon search categories
 * 
 * GET /api/amazon/search/categories
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { equipment_names } = body;
    
    if (!Array.isArray(equipment_names)) {
      return NextResponse.json(
        { error: 'equipment_names must be an array' },
        { status: 400 }
      );
    }

    // Search for multiple equipment items
    const searchPromises = equipment_names.map(async (name: string) => {
      try {
        const result = await searchAmazonProducts({
          keywords: name,
          itemCount: 3, // Fewer items for bulk search
          searchIndex: 'All'
        });
        return {
          equipment: name,
          products: result.products,
          success: true
        };
      } catch (error) {
        return {
          equipment: name,
          products: [],
          success: false,
          error: error instanceof Error ? error.message : 'Search failed'
        };
      }
    });

    const results = await Promise.all(searchPromises);
    
    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Bulk search API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'BULK_SEARCH_ERROR'
        }
      },
      { status: 500 }
    );
  }
}