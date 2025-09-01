import { NextRequest, NextResponse } from 'next/server';
import { getAmazonProduct } from '../../../../../../lib/amazon-api';

/**
 * Get Amazon Product Details by ASIN
 * 
 * GET /api/amazon/product/[asin]
 * 
 * Parameters:
 * - asin: Amazon Standard Identification Number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { asin: string } }
) {
  try {
    const { asin } = params;
    
    if (!asin) {
      return NextResponse.json(
        { error: 'ASIN is required' },
        { status: 400 }
      );
    }

    // Validate ASIN format (basic check)
    if (!/^[A-Z0-9]{10}$/.test(asin)) {
      return NextResponse.json(
        { error: 'Invalid ASIN format' },
        { status: 400 }
      );
    }

    // Get product details from Amazon API
    const product = await getAmazonProduct(asin);
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Amazon product API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'AMAZON_PRODUCT_ERROR'
        }
      },
      { status: 500 }
    );
  }
}