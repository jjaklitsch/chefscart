import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Get All Equipment API Route
 * GET /api/shop/get-all-equipment
 * 
 * Returns ALL equipment items in the database
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get ALL equipment items
    const { data: equipment, error } = await supabase
      .from('cooking_equipment')
      .select('id, display_name, is_essential, popularity_score')
      .order('display_name');

    if (error) {
      console.error('Error fetching equipment:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch equipment',
        details: error 
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalCount: equipment?.length || 0,
        equipment: equipment || []
      }
    });

  } catch (error) {
    console.error('Error in get-all-equipment:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}