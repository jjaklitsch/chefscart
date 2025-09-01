import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updates = [];

    // Update Prep Tools & Gadgets with knife image (since it's a common prep tool)
    const { data: prepProducts, error: prepError } = await supabase
      .from('amazon_products')
      .select('primary_image_url')
      .ilike('product_title', '%knife%')
      .not('primary_image_url', 'is', null)
      .neq('primary_image_url', 'https://example.com/image.jpg')
      .limit(1);

    if (prepProducts?.[0]) {
      const { error: prepUpdateError } = await supabase
        .from('shop_categories')
        .update({ image_url: prepProducts[0].primary_image_url })
        .eq('slug', 'prep-tools-gadgets');

      updates.push({
        category: 'Prep Tools & Gadgets',
        success: !prepUpdateError,
        image: prepProducts[0].primary_image_url,
        error: prepUpdateError?.message
      });
    }

    // Update Measuring & Mixing with measuring cups image
    const { data: measuringProducts, error: measuringError } = await supabase
      .from('amazon_products')
      .select('primary_image_url')
      .ilike('product_title', '%measuring%')
      .not('primary_image_url', 'is', null)
      .limit(1);

    if (measuringProducts?.[0]) {
      const { error: measuringUpdateError } = await supabase
        .from('shop_categories')
        .update({ image_url: measuringProducts[0].primary_image_url })
        .eq('slug', 'measuring-mixing');

      updates.push({
        category: 'Measuring & Mixing',
        success: !measuringUpdateError,
        image: measuringProducts[0].primary_image_url,
        error: measuringUpdateError?.message
      });
    }

    return NextResponse.json({
      success: true,
      data: { updates }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}