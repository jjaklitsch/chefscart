import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find the Microplane Grater equipment
    const { data: microplane, error: eqError } = await supabase
      .from('cooking_equipment')
      .select('*')
      .eq('display_name', 'Microplane Grater');

    // Check for products with equipment_id match
    let productsByEqId = [];
    if (microplane?.[0]) {
      const { data: products1, error: prod1Error } = await supabase
        .from('amazon_products')
        .select('*')
        .eq('equipment_id', microplane[0].id);
      
      productsByEqId = products1 || [];
    }

    // Check for products by name matching
    const { data: productsByName, error: prod2Error } = await supabase
      .from('amazon_products')
      .select('*')
      .or('product_title.ilike.%microplane%,search_term.ilike.%microplane%,product_title.ilike.%grater%,search_term.ilike.%grater%')
      .not('primary_image_url', 'is', null);

    return NextResponse.json({
      success: true,
      data: {
        microplaneEquipment: microplane || [],
        productsByEqId,
        productsByName: productsByName || [],
        errors: { eqError, prod2Error }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}