import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check which equipment IDs have products
    const { data: productsWithEquipment, error: prodErr } = await supabase
      .from('amazon_products')
      .select(`
        equipment_id,
        product_title,
        primary_image_url,
        cooking_equipment(display_name)
      `)
      .not('primary_image_url', 'is', null)
      .limit(10);

    // Get equipment in categories that should have products
    const { data: equipmentInCategories, error: eqErr } = await supabase
      .from('cooking_equipment')
      .select(`
        id,
        display_name,
        equipment_categories!inner(
          category_id,
          category:shop_categories!inner(name, is_featured)
        )
      `)
      .eq('equipment_categories.category.is_featured', true)
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        productsWithEquipment: productsWithEquipment || [],
        equipmentInCategories: equipmentInCategories || [],
        errors: { prodErr, eqErr }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}