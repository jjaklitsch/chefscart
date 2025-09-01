import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get featured categories with image URLs
    const { data: categories, error: catError } = await supabase
      .from('shop_categories')
      .select('id, name, slug, image_url, is_featured')
      .eq('is_featured', true)
      .order('sort_order');

    return NextResponse.json({
      success: true,
      data: {
        categories: categories || [],
        error: catError
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}