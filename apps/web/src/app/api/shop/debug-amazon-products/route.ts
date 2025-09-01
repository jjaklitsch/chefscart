import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check amazon_products structure
    const { data: products, error: prodErr } = await supabase
      .from('amazon_products')
      .select('*')
      .limit(5);

    // Check if any products have equipment_id
    const { data: productsWithEqId, error: eqIdErr } = await supabase
      .from('amazon_products')
      .select('equipment_id, product_title, primary_image_url')
      .not('equipment_id', 'is', null)
      .limit(5);

    // Just get any products with images
    const { data: productsWithImages, error: imgErr } = await supabase
      .from('amazon_products')
      .select('equipment_id, product_title, primary_image_url')
      .not('primary_image_url', 'is', null)
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        products: products || [],
        productsWithEqId: productsWithEqId || [],
        productsWithImages: productsWithImages || [],
        errors: { prodErr, eqIdErr, imgErr }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}