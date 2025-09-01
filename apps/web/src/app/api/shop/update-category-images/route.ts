import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Update Category Images API Route
 * GET /api/shop/update-category-images
 * 
 * This endpoint updates category images with the first product image from each category
 */
export async function GET(request: NextRequest) {
  try {
    // Use service role key for admin operations
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get featured categories
    const { data: categoryData, error: categoryError } = await supabase
      .from('shop_categories')
      .select('id, slug, name')
      .eq('is_featured', true);

    if (categoryError) {
      throw new Error(`Failed to fetch categories: ${categoryError.message}`);
    }

    console.log('Found categories:', categoryData?.map(c => c.name));

    const updates = [];

    // Process each category to find the first available product image
    for (const category of categoryData || []) {
      // Get products based on category keywords - more flexible approach
      let firstImage = null;
      let searchTerms = [];

      // Define search terms for each category
      switch (category.slug) {
        case 'knives-cutting-tools':
          searchTerms = ['chef knife', 'knife'];
          break;
        case 'cookware-pans':
          searchTerms = ['cooking pot', 'pan', 'cookware'];
          break;
        case 'baking-essentials':
          searchTerms = ['measuring cups', 'baking'];
          break;
        case 'kitchen-appliances':
          searchTerms = ['appliance', 'blender'];
          break;
        case 'prep-tools-gadgets':
          searchTerms = ['prep', 'gadget'];
          break;
        case 'measuring-mixing':
          searchTerms = ['measuring cups', 'measuring'];
          break;
        default:
          searchTerms = [category.name.toLowerCase()];
      }

      // Try to find products with these search terms
      for (const term of searchTerms) {
        const { data: products, error: prodError } = await supabase
          .from('amazon_products')
          .select('primary_image_url')
          .ilike('search_term', `%${term}%`)
          .not('primary_image_url', 'is', null)
          .limit(1);

        if (products?.[0]?.primary_image_url) {
          firstImage = products[0].primary_image_url;
          break;
        }
      }

      // Fallback: get any product with image
      if (!firstImage) {
        const { data: products, error: prodError } = await supabase
          .from('amazon_products')
          .select('primary_image_url')
          .not('primary_image_url', 'is', null)
          .limit(1);
        
        firstImage = products?.[0]?.primary_image_url;
      }

      if (firstImage) {
        // Update the category with the image
        const { error: updateError } = await supabase
          .from('shop_categories')
          .update({ image_url: firstImage })
          .eq('id', category.id);

        if (updateError) {
          console.error(`Error updating ${category.name}:`, updateError);
          updates.push({
            category: category.name,
            success: false,
            error: updateError.message
          });
        } else {
          updates.push({
            category: category.name,
            success: true,
            image: firstImage
          });
        }
      } else {
        updates.push({
          category: category.name,
          success: false,
          error: 'No product images found'
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        updatedCategories: updates.length,
        results: updates
      }
    });

  } catch (error) {
    console.error('Category image update error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}