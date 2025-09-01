import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Count total equipment
    const { data: totalEquipment, error: totalError } = await supabase
      .from('cooking_equipment')
      .select('id', { count: 'exact' });

    // Count essential equipment
    const { data: essentialEquipment, error: essentialError } = await supabase
      .from('cooking_equipment')
      .select('id', { count: 'exact' })
      .eq('is_essential', true);

    // Get top 15 most popular equipment
    const { data: topEquipment, error: topError } = await supabase
      .from('cooking_equipment')
      .select('display_name, is_essential, popularity_score')
      .order('popularity_score', { ascending: false })
      .limit(15);

    return NextResponse.json({
      success: true,
      data: {
        totalEquipment: totalEquipment?.length || 0,
        essentialEquipment: essentialEquipment?.length || 0,
        topEquipment: topEquipment || [],
        errors: { totalError, essentialError, topError }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}