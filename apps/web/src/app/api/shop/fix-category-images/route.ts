import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updates = [];

    // Get different product images for each category to avoid duplicates
    const { data: allProducts, error: productsError } = await supabase
      .from('amazon_products')
      .select('product_title, primary_image_url, search_term')
      .not('primary_image_url', 'is', null)
      .neq('primary_image_url', 'https://example.com/image.jpg');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json({ success: false, error: productsError.message });
    }

    console.log('Available products:', allProducts?.slice(0, 5));

    // Manually assign unique images to each category
    const categoryMappings = [
      {
        slug: 'knives-cutting-tools',
        name: 'Knives & Cutting Tools',
        searchTerms: ['knife'],
        preferredImage: null
      },
      {
        slug: 'cookware-pans', 
        name: 'Cookware & Pans',
        searchTerms: ['pot', 'cooking'],
        preferredImage: null
      },
      {
        slug: 'baking-essentials',
        name: 'Baking Essentials', 
        searchTerms: ['measuring'],
        preferredImage: null
      },
      {
        slug: 'kitchen-appliances',
        name: 'Kitchen Appliances',
        searchTerms: ['blender'],
        preferredImage: null
      },
      {
        slug: 'prep-tools-gadgets',
        name: 'Prep Tools & Gadgets',
        searchTerms: ['gadget', 'tool'],
        preferredImage: null
      },
      {
        slug: 'measuring-mixing',
        name: 'Measuring & Mixing',
        searchTerms: ['measuring', 'cups'],
        preferredImage: null
      }
    ];

    // Find unique images for each category
    const usedImages = new Set();
    
    for (const mapping of categoryMappings) {
      let selectedImage = null;
      
      // Try each search term to find a unique image
      for (const term of mapping.searchTerms) {
        const matchingProducts = allProducts?.filter(p => 
          (p.search_term?.toLowerCase().includes(term.toLowerCase()) || 
           p.product_title?.toLowerCase().includes(term.toLowerCase())) &&
          !usedImages.has(p.primary_image_url)
        ) || [];
        
        if (matchingProducts.length > 0) {
          selectedImage = matchingProducts[0]?.primary_image_url;
          usedImages.add(selectedImage);
          break;
        }
      }

      // Fallback to any unused image
      if (!selectedImage) {
        const unusedProducts = allProducts?.filter(p => !usedImages.has(p.primary_image_url)) || [];
        if (unusedProducts.length > 0) {
          selectedImage = unusedProducts[0]?.primary_image_url;
          usedImages.add(selectedImage);
        }
      }

      if (selectedImage) {
        const { error: updateError } = await supabase
          .from('shop_categories')
          .update({ image_url: selectedImage })
          .eq('slug', mapping.slug);

        updates.push({
          category: mapping.name,
          slug: mapping.slug,
          success: !updateError,
          image: selectedImage,
          error: updateError?.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { updates, totalProducts: allProducts?.length || 0 }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}