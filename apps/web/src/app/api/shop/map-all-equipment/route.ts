import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Map All Equipment API Route
 * POST /api/shop/map-all-equipment
 * 
 * Maps ALL 162 equipment items to their appropriate categories based on name patterns
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Define category IDs
    const categories = {
      knivesCutting: '56976c62-0096-4ae0-be95-0b3e3b98b2c8',
      cookwarePans: '230fc546-9101-4c3f-8f3d-2fa90c07042d',
      bakingEssentials: '5cb88c1e-26e7-43e7-aa8d-86ef1b441eb1',
      kitchenAppliances: '952384f0-c3cb-474a-82b6-a7259d6b2696',
      prepToolsGadgets: '1f89b10a-e2e8-4d40-909d-856001c03589',
      measuringMixing: '6a9f4892-8ab2-4668-aefd-b42c730a334f',
      servingPresentation: '0c4fb9d2-34d5-496b-a7d8-b138f8f38917',
      storagePreservation: 'e9be4f74-b46c-4a8b-aacd-1295888fad8e',
      specialtyEquipment: '295f581d-4b53-4bee-babd-0e1aee3a96cd'
    };

    // Get ALL equipment items
    const { data: allEquipment, error: equipError } = await supabase
      .from('cooking_equipment')
      .select('id, display_name')
      .order('display_name');

    if (equipError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch equipment',
        details: equipError 
      });
    }

    // Clear existing mappings
    const { error: clearError } = await supabase
      .from('equipment_categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (clearError) {
      console.error('Error clearing mappings:', clearError);
    }

    // Map equipment based on name patterns
    const mappings: { equipment_id: string; category_id: string }[] = [];
    
    allEquipment?.forEach(item => {
      const name = item.display_name.toLowerCase();
      let categoryId = '';

      // Knives & Cutting Tools
      if (name.includes('knife') || name.includes('cutting board') || name.includes('peeler') || 
          name.includes('mandoline') || name.includes('scissors') || name.includes('sharpener') ||
          name.includes('slicer')) {
        categoryId = categories.knivesCutting;
      }
      // Cookware & Pans
      else if (name.includes('pan') || name.includes('pot') || name.includes('skillet') || 
               name.includes('wok') || name.includes('dutch oven') || name.includes('stockpot') ||
               name.includes('saucepan') || name.includes('griddle') || name.includes('roasting') ||
               name.includes('casserole') || name.includes('braiser')) {
        categoryId = categories.cookwarePans;
      }
      // Baking Essentials
      else if (name.includes('baking') || name.includes('cake') || name.includes('muffin') || 
               name.includes('cookie') || name.includes('pastry') || name.includes('rolling pin') ||
               name.includes('bake') || name.includes('oven mitt') || name.includes('pot holder') ||
               name.includes('cooling rack') || name.includes('pie') || name.includes('tart') ||
               name.includes('loaf') || name.includes('dough') || name.includes('flour') ||
               name.includes('decorating') || name.includes('piping')) {
        categoryId = categories.bakingEssentials;
      }
      // Kitchen Appliances
      else if (name.includes('blender') || name.includes('processor') || name.includes('mixer') ||
               name.includes('toaster') || name.includes('oven') || name.includes('stove') ||
               name.includes('microwave') || name.includes('air fryer') || name.includes('instant pot') ||
               name.includes('slow cooker') || name.includes('rice cooker') || name.includes('pressure cooker') ||
               name.includes('coffee') || name.includes('kettle') || name.includes('juicer') ||
               name.includes('grill') || name.includes('smoker') || name.includes('sous vide') ||
               name.includes('dehydrator') || name.includes('waffle') || name.includes('sandwich maker') ||
               name.includes('electric') || name.includes('machine')) {
        categoryId = categories.kitchenAppliances;
      }
      // Measuring & Mixing
      else if (name.includes('measuring') || name.includes('mixing bowl') || name.includes('whisk') ||
               name.includes('scale') || name.includes('thermometer') || name.includes('timer') ||
               name.includes('beater')) {
        categoryId = categories.measuringMixing;
      }
      // Storage & Preservation
      else if (name.includes('container') || name.includes('storage') || name.includes('tupperware') ||
               name.includes('jar') || name.includes('canister') || name.includes('foil') ||
               name.includes('wrap') || name.includes('bag') || name.includes('ziploc') ||
               name.includes('vacuum') || name.includes('seal')) {
        categoryId = categories.storagePreservation;
      }
      // Serving & Presentation
      else if (name.includes('plate') || name.includes('serving') || name.includes('platter') ||
               name.includes('tray') || name.includes('dish') || name.includes('towel') ||
               name.includes('napkin') || name.includes('tablecloth')) {
        categoryId = categories.servingPresentation;
      }
      // Specialty Equipment
      else if (name.includes('tortilla press') || name.includes('pasta') || name.includes('pizza') ||
               name.includes('mortar') || name.includes('pestle') || name.includes('tagine') ||
               name.includes('fondue') || name.includes('raclette') || name.includes('sushi') ||
               name.includes('bamboo')) {
        categoryId = categories.specialtyEquipment;
      }
      // Prep Tools & Gadgets (default for general tools)
      else if (name.includes('spatula') || name.includes('spoon') || name.includes('fork') ||
               name.includes('ladle') || name.includes('tongs') || name.includes('turner') ||
               name.includes('masher') || name.includes('grater') || name.includes('zester') ||
               name.includes('colander') || name.includes('strainer') || name.includes('sieve') ||
               name.includes('opener') || name.includes('corkscrew') || name.includes('garlic press') ||
               name.includes('ice cream scoop') || name.includes('melon baller') || name.includes('scoop') ||
               name.includes('brush') || name.includes('baster')) {
        categoryId = categories.prepToolsGadgets;
      }
      // Additional catch-all for common items
      else if (name === 'bowl') {
        categoryId = categories.measuringMixing;
      }
      else if (name.includes('paper')) {
        categoryId = categories.storagePreservation;
      }
      // Default to prep tools for anything else
      else {
        categoryId = categories.prepToolsGadgets;
      }

      if (categoryId) {
        mappings.push({
          equipment_id: item.id,
          category_id: categoryId
        });
      }
    });

    // Insert all mappings in batches
    const batchSize = 50;
    for (let i = 0; i < mappings.length; i += batchSize) {
      const batch = mappings.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('equipment_categories')
        .insert(batch);
      
      if (insertError) {
        console.error(`Error inserting batch ${i/batchSize + 1}:`, insertError);
      }
    }

    // Get counts by category
    const { data: categoryStats } = await supabase
      .from('equipment_categories')
      .select('category_id')
      .order('category_id');

    const countsByCategory: { [key: string]: number } = {};
    categoryStats?.forEach(item => {
      countsByCategory[item.category_id] = (countsByCategory[item.category_id] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully mapped ${mappings.length} equipment items`,
      data: {
        totalEquipment: allEquipment?.length || 0,
        totalMappings: mappings.length,
        countsByCategory,
        specificCounts: {
          knivesCutting: countsByCategory[categories.knivesCutting] || 0,
          cookwarePans: countsByCategory[categories.cookwarePans] || 0,
          bakingEssentials: countsByCategory[categories.bakingEssentials] || 0,
          kitchenAppliances: countsByCategory[categories.kitchenAppliances] || 0,
          prepToolsGadgets: countsByCategory[categories.prepToolsGadgets] || 0,
          measuringMixing: countsByCategory[categories.measuringMixing] || 0,
          servingPresentation: countsByCategory[categories.servingPresentation] || 0,
          storagePreservation: countsByCategory[categories.storagePreservation] || 0,
          specialtyEquipment: countsByCategory[categories.specialtyEquipment] || 0
        }
      }
    });

  } catch (error) {
    console.error('Error in map-all-equipment:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}