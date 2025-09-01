import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Priority equipment items that are commonly needed and currently missing
    const priorityEquipment = [
      { name: "spatula", display_name: "Spatula", amazon_search_terms: ["spatula", "cooking spatula"], popularity_score: 85, is_essential: true },
      { name: "measuring cup", display_name: "Measuring Cup", amazon_search_terms: ["measuring cup", "measuring cups"], popularity_score: 90, is_essential: true },
      { name: "steamer basket", display_name: "Steamer Basket", amazon_search_terms: ["steamer basket", "vegetable steamer"], popularity_score: 70, is_essential: false },
      { name: "mixing bowl", display_name: "Mixing Bowl", amazon_search_terms: ["mixing bowl", "mixing bowls"], popularity_score: 95, is_essential: true },
      { name: "whisk", display_name: "Whisk", amazon_search_terms: ["whisk", "kitchen whisk"], popularity_score: 85, is_essential: true },
      { name: "ladle", display_name: "Ladle", amazon_search_terms: ["ladle", "soup ladle"], popularity_score: 75, is_essential: false },
      { name: "tongs", display_name: "Tongs", amazon_search_terms: ["tongs", "kitchen tongs"], popularity_score: 80, is_essential: false },
      { name: "measuring spoon", display_name: "Measuring Spoon", amazon_search_terms: ["measuring spoon", "measuring spoons"], popularity_score: 85, is_essential: true },
      { name: "wooden spoon", display_name: "Wooden Spoon", amazon_search_terms: ["wooden spoon", "cooking spoon"], popularity_score: 80, is_essential: false },
      { name: "colander", display_name: "Colander", amazon_search_terms: ["colander", "strainer"], popularity_score: 75, is_essential: false },
      { name: "sieve", display_name: "Sieve", amazon_search_terms: ["sieve", "fine mesh strainer"], popularity_score: 70, is_essential: false },
      { name: "rolling pin", display_name: "Rolling Pin", amazon_search_terms: ["rolling pin", "baking rolling pin"], popularity_score: 65, is_essential: false },
      { name: "oven mitt", display_name: "Oven Mitt", amazon_search_terms: ["oven mitt", "oven mitts"], popularity_score: 90, is_essential: true },
      { name: "bowl", display_name: "Bowl", amazon_search_terms: ["bowl", "serving bowl"], popularity_score: 95, is_essential: true },
      { name: "spoon", display_name: "Spoon", amazon_search_terms: ["spoon", "kitchen spoon"], popularity_score: 95, is_essential: true },
      { name: "fork", display_name: "Fork", amazon_search_terms: ["fork", "kitchen fork"], popularity_score: 90, is_essential: true },
      { name: "kitchen thermometer", display_name: "Kitchen Thermometer", amazon_search_terms: ["kitchen thermometer", "cooking thermometer"], popularity_score: 70, is_essential: false },
      { name: "kitchen timer", display_name: "Kitchen Timer", amazon_search_terms: ["kitchen timer", "cooking timer"], popularity_score: 75, is_essential: false },
      { name: "kitchen scale", display_name: "Kitchen Scale", amazon_search_terms: ["kitchen scale", "food scale"], popularity_score: 80, is_essential: false },
      { name: "slotted spoon", display_name: "Slotted Spoon", amazon_search_terms: ["slotted spoon", "perforated spoon"], popularity_score: 70, is_essential: false }
    ]

    const results = []
    for (const equipment of priorityEquipment) {
      try {
        const { data, error } = await supabase
          .from('cooking_equipment')
          .insert([equipment])
          .select()
        
        if (error) {
          console.error(`Error inserting ${equipment.name}:`, error)
          results.push({ name: equipment.name, success: false, error: error.message })
        } else {
          results.push({ name: equipment.name, success: true, id: data[0]?.id })
        }
      } catch (err) {
        console.error(`Exception inserting ${equipment.name}:`, err)
        results.push({ name: equipment.name, success: false, error: String(err) })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Added ${successCount} equipment items, ${failCount} failed`,
      results,
      added: results.filter(r => r.success).map(r => r.name),
      failed: results.filter(r => !r.success).map(r => ({ name: r.name, error: r.error }))
    })

  } catch (error) {
    console.error('Error in add equipment endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}