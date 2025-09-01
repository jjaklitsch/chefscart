import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Count all essential equipment
    const { data: essentialCount, error: countError } = await supabase
      .from('cooking_equipment')
      .select('id', { count: 'exact' })
      .eq('is_essential', true);

    // Get all essential equipment names
    const { data: allEssential, error: allError } = await supabase
      .from('cooking_equipment')
      .select('id, display_name')
      .eq('is_essential', true)
      .order('popularity_score', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        totalEssential: essentialCount?.length || 0,
        equipment: allEssential || [],
        errors: { countError, allError }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}