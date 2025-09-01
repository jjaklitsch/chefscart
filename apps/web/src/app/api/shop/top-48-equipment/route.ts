import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get top 48 equipment items
    const { data: topEquipment, error: topError } = await supabase
      .from('cooking_equipment')
      .select('display_name, is_essential, popularity_score')
      .order('popularity_score', { ascending: false })
      .limit(48);

    return NextResponse.json({
      success: true,
      data: {
        equipmentCount: topEquipment?.length || 0,
        equipment: topEquipment || [],
        essentialCount: topEquipment?.filter(e => e.is_essential).length || 0,
        error: topError
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}