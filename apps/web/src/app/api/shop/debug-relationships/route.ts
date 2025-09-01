import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Debug category relationships
    const { data: categories } = await supabase
      .from('shop_categories')
      .select('id, name, slug')
      .eq('is_featured', true)
      .limit(2);

    const results = [];

    for (const category of categories || []) {
      // Check equipment_categories relationship
      const { data: eqCats, error: eqCatErr } = await supabase
        .from('equipment_categories')
        .select('*')
        .eq('category_id', category.id)
        .limit(3);

      // Check direct equipment in category
      const { data: equipment, error: eqErr } = await supabase
        .from('cooking_equipment')
        .select(`
          id,
          display_name,
          equipment_categories!inner(category_id)
        `)
        .eq('equipment_categories.category_id', category.id)
        .limit(3);

      // Check Amazon products
      let productCheck = null;
      if (equipment && equipment[0]) {
        const { data: products, error: prodErr } = await supabase
          .from('amazon_products')
          .select('id, product_title, primary_image_url')
          .eq('equipment_id', equipment[0].id)
          .not('primary_image_url', 'is', null)
          .limit(3);
        
        productCheck = {
          products: products || [],
          error: prodErr
        };
      }

      results.push({
        category: category.name,
        categoryId: category.id,
        equipmentCategories: {
          data: eqCats || [],
          error: eqCatErr,
          count: eqCats?.length || 0
        },
        equipment: {
          data: equipment || [],
          error: eqErr,
          count: equipment?.length || 0
        },
        productCheck
      });
    }

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}