import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Fix Featured Categories API Route
 * GET /api/shop/fix-featured-categories
 * 
 * Makes prep tools and measuring & mixing featured categories
 */
export async function GET(request: NextRequest) {
  try {
    // Use service role key for admin operations
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Make prep tools and measuring & mixing featured
    const { error: prepError } = await supabase
      .from('shop_categories')
      .update({ 
        is_featured: true,
        description: 'Versatile gadgets and tools that make food preparation faster and easier'
      })
      .eq('slug', 'prep-tools-gadgets');

    if (prepError) {
      console.error('Error updating prep-tools-gadgets:', prepError);
    }

    const { error: mixingError } = await supabase
      .from('shop_categories')
      .update({
        is_featured: true,
        description: 'Precise measuring tools, mixing bowls, and equipment for perfect recipes'
      })
      .eq('slug', 'measuring-mixing');

    if (mixingError) {
      console.error('Error updating measuring-mixing:', mixingError);
    }

    // Fix sort orders
    await supabase.from('shop_categories').update({ sort_order: 5 }).eq('slug', 'prep-tools-gadgets');
    await supabase.from('shop_categories').update({ sort_order: 6 }).eq('slug', 'measuring-mixing');

    // Check results
    const { data: categories, error: checkError } = await supabase
      .from('shop_categories')
      .select('name, is_featured, sort_order, description')
      .eq('is_featured', true)
      .order('sort_order');

    return NextResponse.json({
      success: true,
      data: {
        prepError,
        mixingError,
        totalFeaturedCategories: categories?.length || 0,
        featuredCategories: categories || []
      }
    });

  } catch (error) {
    console.error('Fix featured categories error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}