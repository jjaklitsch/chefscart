import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if shop_categories table exists and has data
    const { data: categories, error: categoriesError } = await supabase
      .from('shop_categories')
      .select('*');

    // Also check equipment_categories table
    const { data: equipmentCategories, error: equipCatError } = await supabase
      .from('equipment_categories')
      .select('*')
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        categories: categories || [],
        categoryCount: categories?.length || 0,
        equipmentCategories: equipmentCategories || [],
        errors: { categoriesError, equipCatError }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}