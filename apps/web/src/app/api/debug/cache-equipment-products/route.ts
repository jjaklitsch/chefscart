import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get all equipment items from database
    const { data: allEquipment, error } = await supabase
      .from('cooking_equipment')
      .select('id, name, display_name, amazon_search_terms')
      .order('popularity_score', { ascending: false })
    
    if (error) {
      console.error('Error fetching equipment:', error)
      return NextResponse.json({ error: 'Failed to fetch equipment items' }, { status: 500 })
    }

    if (!allEquipment || allEquipment.length === 0) {
      return NextResponse.json({ error: 'No equipment items found' }, { status: 404 })
    }

    const results = []
    let successCount = 0
    let failCount = 0
    let rateLimitDelay = 1000 // 1 second delay between requests

    console.log(`Starting to cache products for ${allEquipment.length} equipment items...`)

    for (const equipment of allEquipment) {
      try {
        console.log(`Processing ${equipment.display_name}...`)
        
        // Use the first Amazon search term, fallback to display name
        const searchTerm = equipment.amazon_search_terms && equipment.amazon_search_terms.length > 0 
          ? equipment.amazon_search_terms[0] 
          : equipment.display_name

        // Call Amazon API
        const amazonResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/amazon/search?q=${encodeURIComponent(searchTerm)}&count=5&category=All`)
        
        if (!amazonResponse.ok) {
          console.error(`Amazon API failed for ${equipment.display_name}: ${amazonResponse.status}`)
          results.push({ 
            equipment_name: equipment.display_name, 
            success: false, 
            error: `Amazon API returned ${amazonResponse.status}` 
          })
          failCount++
          continue
        }

        const amazonData = await amazonResponse.json()

        if (amazonData.success && amazonData.data?.products && amazonData.data.products.length > 0) {
          // Successfully got products
          results.push({
            equipment_name: equipment.display_name,
            equipment_id: equipment.id,
            success: true,
            products_found: amazonData.data.products.length,
            search_term_used: searchTerm,
            sample_product: {
              title: amazonData.data.products[0].product_title,
              price: amazonData.data.products[0].offer?.price,
              product_id: amazonData.data.products[0].product_id
            }
          })
          successCount++
          console.log(`✅ Found ${amazonData.data.products.length} products for ${equipment.display_name}`)
        } else {
          // No products found or API error
          results.push({
            equipment_name: equipment.display_name,
            equipment_id: equipment.id,
            success: false,
            error: 'No products found or API error',
            search_term_used: searchTerm
          })
          failCount++
          console.log(`❌ No products found for ${equipment.display_name}`)
        }

        // Rate limiting delay
        if (rateLimitDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay))
        }

      } catch (err) {
        console.error(`Exception processing ${equipment.display_name}:`, err)
        results.push({
          equipment_name: equipment.display_name,
          equipment_id: equipment.id,
          success: false,
          error: String(err)
        })
        failCount++
      }
    }

    return NextResponse.json({
      message: `Product caching complete: ${successCount} successful, ${failCount} failed`,
      total_equipment: allEquipment.length,
      success_count: successCount,
      fail_count: failCount,
      rate_limit_delay: rateLimitDelay,
      results: results.slice(0, 20), // Limit response size, show first 20 results
      successful_equipment: results.filter(r => r.success).map(r => r.equipment_name),
      failed_equipment: results.filter(r => !r.success).map(r => ({ 
        name: r.equipment_name, 
        error: r.error,
        search_term: r.search_term_used 
      }))
    })

  } catch (error) {
    console.error('Error in cache equipment products endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 })
  }
}