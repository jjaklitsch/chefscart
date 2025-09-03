import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Update Equipment Mappings API Route
 * POST /api/shop/update-equipment-mappings
 * 
 * Maps all equipment items to their appropriate categories
 */
export async function POST(request: NextRequest) {
  try {
    // Use service role key for admin operations
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
      storagePreservation: 'e9be4f74-b46c-4a8b-aacd-1295888fad8e'
    };

    // Equipment mappings
    const mappings = [
      // Knives & Cutting Tools
      { equipment_id: '9eba7873-844e-46f7-a6ff-30b21426ebe1', category_id: categories.knivesCutting }, // Chef's Knife (already exists)
      { equipment_id: '0e5ad3e7-f4e3-4981-892e-fd6bcfe0a475', category_id: categories.knivesCutting }, // Kitchen Knife
      { equipment_id: 'b575bf87-4779-4f48-ab7d-a3a79c5a19d1', category_id: categories.knivesCutting }, // Cutting Board
      { equipment_id: 'b95df5fa-b1f0-4cad-9e7e-d3ddf775fb0c', category_id: categories.knivesCutting }, // Peeler
      
      // Cookware & Pans
      { equipment_id: 'd51ef474-5e40-4190-99ca-d59850f80503', category_id: categories.cookwarePans }, // Frying Pan
      { equipment_id: 'b67572ce-8532-4316-aea0-cbd96e2464a2', category_id: categories.cookwarePans }, // Pot
      { equipment_id: '62f40f94-f31a-4908-86ad-6575f781969d', category_id: categories.cookwarePans }, // Sauce Pan
      
      // Baking Essentials
      { equipment_id: '11967f3b-7d17-4a19-a06b-1514a51dde15', category_id: categories.bakingEssentials }, // Baking Sheet
      { equipment_id: '585f60a7-2017-457d-8594-c7f1f37c2f79', category_id: categories.bakingEssentials }, // Baking Pan
      { equipment_id: '0a75bd17-1974-4dd6-9b17-aa98c7395a32', category_id: categories.bakingEssentials }, // Baking Paper
      { equipment_id: 'fe712b83-d2d2-411a-ad55-0cca88b8e3df', category_id: categories.bakingEssentials }, // Oven Mitt
      { equipment_id: '45194bab-835b-4a4f-9a4e-d6fdc929eb3f', category_id: categories.bakingEssentials }, // Pot Holder
      
      // Kitchen Appliances
      { equipment_id: 'ae3f739e-f809-41fe-9cb8-39c64085b43d', category_id: categories.kitchenAppliances }, // Oven
      { equipment_id: '5fbadd0a-2f3f-48e1-8a87-b956401aab68', category_id: categories.kitchenAppliances }, // Stove
      { equipment_id: '1d28d17f-e5b8-4de8-a53e-46ca3a19a73d', category_id: categories.kitchenAppliances }, // Microwave
      
      // Prep Tools & Gadgets
      { equipment_id: 'f260ecfb-5ff8-413f-a294-3c887c9edb51', category_id: categories.prepToolsGadgets }, // Spatula
      { equipment_id: 'e44c7986-205a-4aa1-a755-839c244f212d', category_id: categories.prepToolsGadgets }, // Grater
      { equipment_id: 'd006a866-20c0-4914-9234-52835701842a', category_id: categories.prepToolsGadgets }, // Fork
      { equipment_id: '23c184e4-3d9e-47f1-9bfe-c2c555a29d17', category_id: categories.prepToolsGadgets }, // Spoon
      
      // Measuring & Mixing (THE FIX!)
      { equipment_id: '860835b6-1327-4395-a392-86b432993ec1', category_id: categories.measuringMixing }, // Mixing Bowl
      { equipment_id: '98f69cab-ef38-4892-a02d-f5fb4d176d78', category_id: categories.measuringMixing }, // Measuring Cup
      { equipment_id: 'f6f8ba62-15b9-4195-8759-515e5e79be0f', category_id: categories.measuringMixing }, // Measuring Spoon
      { equipment_id: 'ac06e9c2-b744-42e6-81b7-36f9fdd843da', category_id: categories.measuringMixing }, // Whisk
      { equipment_id: '727327af-1429-4b23-97b2-ced31992dabc', category_id: categories.measuringMixing }, // Bowl
      
      // Storage & Preservation
      { equipment_id: '7d118df4-a89a-47ac-8c0a-127e4daf799a', category_id: categories.storagePreservation }, // Aluminum Foil
      { equipment_id: 'c25dc2af-aaf8-46bd-bb16-e3dccb450253', category_id: categories.storagePreservation }, // Ziploc Bags
      { equipment_id: '2809ad86-18a9-4bd6-8100-71620dfde0c3', category_id: categories.storagePreservation }, // Plastic Wrap
      
      // Serving & Presentation
      { equipment_id: 'ec531be5-551b-4429-b0b4-ade61c456580', category_id: categories.servingPresentation }, // Paper Towels
      { equipment_id: '71021389-83da-437e-9d1b-b6c2caaea536', category_id: categories.servingPresentation }  // Kitchen Towels
    ];

    // First, clear ALL existing mappings (fresh start)
    const { error: clearError } = await supabase
      .from('equipment_categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (clearError) {
      console.error('Error clearing existing mappings:', clearError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to clear existing mappings',
        details: clearError 
      });
    }

    // Insert all new mappings
    const { data, error } = await supabase
      .from('equipment_categories')
      .insert(mappings);

    if (error) {
      console.error('Error inserting mappings:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to insert mappings',
        details: error 
      });
    }

    // Verify the results
    const { data: categoryStats } = await supabase
      .from('equipment_categories')
      .select('category_id, equipment_id')
      .order('category_id');

    // Count items per category
    const countsByCategory: { [key: string]: number } = {};
    categoryStats?.forEach(item => {
      countsByCategory[item.category_id] = (countsByCategory[item.category_id] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      message: 'Equipment mappings updated successfully',
      data: {
        totalMappings: mappings.length,
        mappingsCreated: data,
        countsByCategory,
        specificCounts: {
          knivesCutting: countsByCategory[categories.knivesCutting] || 0,
          cookwarePans: countsByCategory[categories.cookwarePans] || 0,
          bakingEssentials: countsByCategory[categories.bakingEssentials] || 0,
          kitchenAppliances: countsByCategory[categories.kitchenAppliances] || 0,
          prepToolsGadgets: countsByCategory[categories.prepToolsGadgets] || 0,
          measuringMixing: countsByCategory[categories.measuringMixing] || 0, // This should be 5!
          servingPresentation: countsByCategory[categories.servingPresentation] || 0,
          storagePreservation: countsByCategory[categories.storagePreservation] || 0
        }
      }
    });

  } catch (error) {
    console.error('Error in update-equipment-mappings:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}