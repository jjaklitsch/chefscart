import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check essential equipment
    const { data: equipment, error: equipmentError } = await supabase
      .from('cooking_equipment')
      .select('id, display_name, is_essential')
      .eq('is_essential', true)
      .limit(5);

    // Check if any products exist for these equipment IDs
    const productChecks = [];
    for (const eq of equipment || []) {
      const { data: products, error: prodError } = await supabase
        .from('amazon_products')
        .select('equipment_id, product_title, primary_image_url')
        .eq('equipment_id', eq.id);

      productChecks.push({
        equipment: eq.display_name,
        equipmentId: eq.id,
        products: products || [],
        hasProducts: (products?.length || 0) > 0,
        error: prodError
      });
    }

    // Also check what equipment_ids actually exist in amazon_products
    const { data: allProductEquipmentIds, error: allError } = await supabase
      .from('amazon_products')
      .select('equipment_id')
      .not('equipment_id', 'is', null)
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        essentialEquipment: equipment || [],
        productChecks,
        existingEquipmentIds: allProductEquipmentIds?.map(p => p.equipment_id) || [],
        errors: { equipmentError, allError }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}