import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check specific categories by slug
    const { data: prepTools, error: prepError } = await supabase
      .from('shop_categories')
      .select('*')
      .eq('slug', 'prep-tools-gadgets');

    const { data: measuring, error: measuringError } = await supabase
      .from('shop_categories')
      .select('*')
      .eq('slug', 'measuring-mixing');

    return NextResponse.json({
      success: true,
      data: {
        prepTools: prepTools || [],
        measuring: measuring || [],
        errors: { prepError, measuringError }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}