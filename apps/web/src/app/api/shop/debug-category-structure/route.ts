import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get first featured category with all fields
    const { data: category, error: catErr } = await supabase
      .from('shop_categories')
      .select('*')
      .eq('is_featured', true)
      .limit(1);

    // Count equipment in first category
    let equipmentCount = 0;
    if (category?.[0]) {
      const { data: equipment, error: eqErr } = await supabase
        .from('cooking_equipment')
        .select(`
          id,
          equipment_categories!inner(category_id)
        `)
        .eq('equipment_categories.category_id', category[0].id);
      
      equipmentCount = equipment?.length || 0;
    }

    // Count products for equipment in that category
    let productCount = 0;
    if (category?.[0]) {
      const { data: products, error: prodErr } = await supabase
        .from('amazon_products')
        .select(`
          id,
          cooking_equipment!inner(
            equipment_categories!inner(category_id)
          )
        `)
        .eq('cooking_equipment.equipment_categories.category_id', category[0].id);
      
      productCount = products?.length || 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        categoryFields: Object.keys(category?.[0] || {}),
        category: category?.[0],
        equipmentCount,
        productCount,
        errors: { catErr }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}