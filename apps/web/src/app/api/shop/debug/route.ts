import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Check categories
    const { data: categories, error: catError } = await supabase
      .from('shop_categories')
      .select('name, slug, is_featured, sort_order, description')
      .order('sort_order');

    // Check equipment count
    const { data: equipment, error: equipError } = await supabase
      .from('cooking_equipment')
      .select('display_name, is_essential')
      .limit(5);

    // Check product count
    const { data: products, error: prodError } = await supabase
      .from('amazon_products')
      .select('product_title')
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        categories: categories || [],
        categoryError: catError,
        equipmentSample: equipment || [],
        equipmentError: equipError,
        productsSample: products || [],
        productsError: prodError,
        totalCategories: categories?.length || 0,
        featuredCategories: categories?.filter((c: any) => c.is_featured)?.length || 0
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}