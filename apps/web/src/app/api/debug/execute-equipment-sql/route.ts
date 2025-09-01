import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // All missing equipment items from the comprehensive analysis
    const missingEquipment = [
      { name: "spatula", display_name: "Spatula", amazon_search_terms: ["spatula", "cooking spatula", "kitchen spatula"], popularity_score: 85, is_essential: true },
      { name: "measuring cup", display_name: "Measuring Cup", amazon_search_terms: ["measuring cup", "measuring cups", "liquid measuring cup"], popularity_score: 90, is_essential: true },
      { name: "steamer basket", display_name: "Steamer Basket", amazon_search_terms: ["steamer basket", "vegetable steamer", "bamboo steamer"], popularity_score: 70, is_essential: false },
      { name: "mixing bowl", display_name: "Mixing Bowl", amazon_search_terms: ["mixing bowl", "mixing bowls", "stainless steel bowl"], popularity_score: 95, is_essential: true },
      { name: "whisk", display_name: "Whisk", amazon_search_terms: ["whisk", "kitchen whisk", "wire whisk"], popularity_score: 85, is_essential: true },
      { name: "measuring spoon", display_name: "Measuring Spoon", amazon_search_terms: ["measuring spoon", "measuring spoons", "teaspoon tablespoon set"], popularity_score: 85, is_essential: true },
      { name: "bowl", display_name: "Bowl", amazon_search_terms: ["bowl", "serving bowl", "ceramic bowl"], popularity_score: 95, is_essential: true },
      { name: "spoon", display_name: "Spoon", amazon_search_terms: ["spoon", "kitchen spoon", "cooking spoon"], popularity_score: 95, is_essential: true },
      { name: "fork", display_name: "Fork", amazon_search_terms: ["fork", "kitchen fork", "serving fork"], popularity_score: 90, is_essential: true },
      { name: "oven mitt", display_name: "Oven Mitt", amazon_search_terms: ["oven mitt", "oven mitts", "heat resistant gloves"], popularity_score: 90, is_essential: true },
      
      // Medium Priority Common Items
      { name: "tongs", display_name: "Tongs", amazon_search_terms: ["tongs", "kitchen tongs", "cooking tongs"], popularity_score: 80, is_essential: false },
      { name: "ladle", display_name: "Ladle", amazon_search_terms: ["ladle", "soup ladle", "serving ladle"], popularity_score: 75, is_essential: false },
      { name: "wooden spoon", display_name: "Wooden Spoon", amazon_search_terms: ["wooden spoon", "cooking spoon", "wooden utensil"], popularity_score: 80, is_essential: false },
      { name: "colander", display_name: "Colander", amazon_search_terms: ["colander", "strainer", "pasta strainer"], popularity_score: 75, is_essential: false },
      { name: "sieve", display_name: "Sieve", amazon_search_terms: ["sieve", "fine mesh strainer", "flour sifter"], popularity_score: 70, is_essential: false },
      { name: "rolling pin", display_name: "Rolling Pin", amazon_search_terms: ["rolling pin", "baking rolling pin", "wooden rolling pin"], popularity_score: 65, is_essential: false },
      { name: "slotted spoon", display_name: "Slotted Spoon", amazon_search_terms: ["slotted spoon", "perforated spoon", "draining spoon"], popularity_score: 70, is_essential: false },
      { name: "kitchen thermometer", display_name: "Kitchen Thermometer", amazon_search_terms: ["kitchen thermometer", "cooking thermometer", "meat thermometer"], popularity_score: 70, is_essential: false },
      { name: "kitchen timer", display_name: "Kitchen Timer", amazon_search_terms: ["kitchen timer", "cooking timer", "digital timer"], popularity_score: 75, is_essential: false },
      { name: "kitchen scale", display_name: "Kitchen Scale", amazon_search_terms: ["kitchen scale", "food scale", "digital scale"], popularity_score: 80, is_essential: false },
      
      // Specialized Tools
      { name: "skimmer", display_name: "Skimmer", amazon_search_terms: ["skimmer", "foam skimmer", "spider strainer"], popularity_score: 50, is_essential: false },
      { name: "funnel", display_name: "Funnel", amazon_search_terms: ["funnel", "kitchen funnel", "canning funnel"], popularity_score: 60, is_essential: false },
      { name: "baster", display_name: "Baster", amazon_search_terms: ["baster", "turkey baster", "bulb baster"], popularity_score: 55, is_essential: false },
      { name: "melon baller", display_name: "Melon Baller", amazon_search_terms: ["melon baller", "ice cream scoop", "fruit baller"], popularity_score: 40, is_essential: false },
      { name: "pastry brush", display_name: "Pastry Brush", amazon_search_terms: ["pastry brush", "basting brush", "silicone brush"], popularity_score: 65, is_essential: false },
      { name: "pastry cutter", display_name: "Pastry Cutter", amazon_search_terms: ["pastry cutter", "dough cutter", "bench scraper"], popularity_score: 50, is_essential: false },
      { name: "dough scraper", display_name: "Dough Scraper", amazon_search_terms: ["dough scraper", "bench scraper", "pastry scraper"], popularity_score: 55, is_essential: false },
      { name: "offset spatula", display_name: "Offset Spatula", amazon_search_terms: ["offset spatula", "icing spatula", "cake spatula"], popularity_score: 60, is_essential: false },
      { name: "palette knife", display_name: "Palette Knife", amazon_search_terms: ["palette knife", "icing knife", "cake decorating knife"], popularity_score: 45, is_essential: false },
      
      // Appliances
      { name: "microwave", display_name: "Microwave", amazon_search_terms: ["microwave", "microwave oven", "countertop microwave"], popularity_score: 85, is_essential: true },
      { name: "oven", display_name: "Oven", amazon_search_terms: ["oven", "wall oven", "convection oven"], popularity_score: 95, is_essential: true },
      { name: "stove", display_name: "Stove", amazon_search_terms: ["stove", "cooktop", "gas range"], popularity_score: 95, is_essential: true },
      { name: "broiler", display_name: "Broiler", amazon_search_terms: ["broiler", "oven broiler", "broiler pan"], popularity_score: 60, is_essential: false },
      { name: "grill", display_name: "Grill", amazon_search_terms: ["grill", "outdoor grill", "gas grill"], popularity_score: 70, is_essential: false },
      { name: "teapot", display_name: "Teapot", amazon_search_terms: ["teapot", "tea kettle", "whistling kettle"], popularity_score: 65, is_essential: false },
      
      // Storage & Prep Items
      { name: "ramekin", display_name: "Ramekin", amazon_search_terms: ["ramekin", "ramekins", "individual baking dish"], popularity_score: 70, is_essential: false },
      { name: "aluminum foil", display_name: "Aluminum Foil", amazon_search_terms: ["aluminum foil", "foil", "heavy duty foil"], popularity_score: 85, is_essential: true },
      { name: "plastic wrap", display_name: "Plastic Wrap", amazon_search_terms: ["plastic wrap", "cling wrap", "food wrap"], popularity_score: 80, is_essential: true },
      { name: "wax paper", display_name: "Wax Paper", amazon_search_terms: ["wax paper", "parchment paper", "baking paper"], popularity_score: 75, is_essential: false },
      { name: "baking paper", display_name: "Baking Paper", amazon_search_terms: ["baking paper", "parchment paper", "non-stick paper"], popularity_score: 80, is_essential: true },
      { name: "ziploc bags", display_name: "Ziploc Bags", amazon_search_terms: ["ziploc bags", "storage bags", "freezer bags"], popularity_score: 85, is_essential: true },
      { name: "kitchen towels", display_name: "Kitchen Towels", amazon_search_terms: ["kitchen towels", "dish towels", "tea towels"], popularity_score: 90, is_essential: true },
      { name: "paper towels", display_name: "Paper Towels", amazon_search_terms: ["paper towels", "kitchen paper", "absorbent towels"], popularity_score: 95, is_essential: true },
      { name: "cheesecloth", display_name: "Cheesecloth", amazon_search_terms: ["cheesecloth", "muslin cloth", "straining cloth"], popularity_score: 50, is_essential: false },
      { name: "kitchen twine", display_name: "Kitchen Twine", amazon_search_terms: ["kitchen twine", "cooking string", "butcher twine"], popularity_score: 55, is_essential: false },
      
      // Baking Specialized Items
      { name: "cake server", display_name: "Cake Server", amazon_search_terms: ["cake server", "pie server", "cake lifter"], popularity_score: 60, is_essential: false },
      { name: "cake topper", display_name: "Cake Topper", amazon_search_terms: ["cake topper", "cake decorations", "birthday candles"], popularity_score: 50, is_essential: false },
      { name: "cookie cutter", display_name: "Cookie Cutter", amazon_search_terms: ["cookie cutter", "cookie cutters", "biscuit cutter"], popularity_score: 65, is_essential: false },
      { name: "muffin liners", display_name: "Muffin Liners", amazon_search_terms: ["muffin liners", "cupcake liners", "baking cups"], popularity_score: 70, is_essential: false },
      { name: "cupcake toppers", display_name: "Cupcake Toppers", amazon_search_terms: ["cupcake toppers", "cake decorations", "edible decorations"], popularity_score: 45, is_essential: false },
      { name: "frosting cake topper", display_name: "Frosting Cake Topper", amazon_search_terms: ["cake decorating tools", "frosting tips", "piping bags"], popularity_score: 50, is_essential: false },
      { name: "edible cake image", display_name: "Edible Cake Image", amazon_search_terms: ["edible cake image", "cake decorating", "photo cake"], popularity_score: 30, is_essential: false },
      
      // Molds and Forms
      { name: "cake pop mold", display_name: "Cake Pop Mold", amazon_search_terms: ["cake pop mold", "cake pop maker", "silicone mold"], popularity_score: 45, is_essential: false },
      { name: "chocolate mold", display_name: "Chocolate Mold", amazon_search_terms: ["chocolate mold", "candy mold", "silicone chocolate mold"], popularity_score: 40, is_essential: false },
      { name: "popsicle molds", display_name: "Popsicle Molds", amazon_search_terms: ["popsicle molds", "ice pop molds", "frozen treat molds"], popularity_score: 50, is_essential: false },
      { name: "ice cube tray", display_name: "Ice Cube Tray", amazon_search_terms: ["ice cube tray", "ice molds", "silicone ice tray"], popularity_score: 80, is_essential: false },
      { name: "kugelhopf pan", display_name: "Kugelhopf Pan", amazon_search_terms: ["kugelhopf pan", "bundt pan", "tube pan"], popularity_score: 40, is_essential: false },
      { name: "silicone kugelhopf pan", display_name: "Silicone Kugelhopf Pan", amazon_search_terms: ["silicone bundt pan", "silicone kugelhopf", "non-stick bundt"], popularity_score: 35, is_essential: false },
      { name: "madeleine form", display_name: "Madeleine Form", amazon_search_terms: ["madeleine pan", "shell cake pan", "madeleine mold"], popularity_score: 35, is_essential: false },
      
      // Serving and Tools
      { name: "gravy boat", display_name: "Gravy Boat", amazon_search_terms: ["gravy boat", "sauce boat", "gravy pitcher"], popularity_score: 60, is_essential: false },
      { name: "ice cream scoop", display_name: "Ice Cream Scoop", amazon_search_terms: ["ice cream scoop", "cookie scoop", "portion scoop"], popularity_score: 75, is_essential: false },
      { name: "salad spinner", display_name: "Salad Spinner", amazon_search_terms: ["salad spinner", "lettuce spinner", "vegetable dryer"], popularity_score: 70, is_essential: false },
      { name: "candy thermometer", display_name: "Candy Thermometer", amazon_search_terms: ["candy thermometer", "deep fry thermometer", "sugar thermometer"], popularity_score: 45, is_essential: false },
      { name: "pot holder", display_name: "Pot Holder", amazon_search_terms: ["pot holder", "hot pad", "trivet"], popularity_score: 85, is_essential: true },
      
      // Specialty Items and Accessories
      { name: "skewers", display_name: "Skewers", amazon_search_terms: ["skewers", "bamboo skewers", "metal skewers"], popularity_score: 65, is_essential: false },
      { name: "wooden skewers", display_name: "Wooden Skewers", amazon_search_terms: ["wooden skewers", "bamboo skewers", "cocktail picks"], popularity_score: 60, is_essential: false },
      { name: "metal skewers", display_name: "Metal Skewers", amazon_search_terms: ["metal skewers", "stainless steel skewers", "reusable skewers"], popularity_score: 55, is_essential: false },
      { name: "cocktail sticks", display_name: "Cocktail Sticks", amazon_search_terms: ["cocktail sticks", "toothpicks", "appetizer picks"], popularity_score: 60, is_essential: false },
      { name: "toothpicks", display_name: "Toothpicks", amazon_search_terms: ["toothpicks", "wooden picks", "cocktail picks"], popularity_score: 70, is_essential: false },
      { name: "popsicle sticks", display_name: "Popsicle Sticks", amazon_search_terms: ["popsicle sticks", "craft sticks", "wooden sticks"], popularity_score: 45, is_essential: false },
      { name: "lollipop sticks", display_name: "Lollipop Sticks", amazon_search_terms: ["lollipop sticks", "cake pop sticks", "candy sticks"], popularity_score: 40, is_essential: false },
      { name: "chopsticks", display_name: "Chopsticks", amazon_search_terms: ["chopsticks", "wooden chopsticks", "cooking chopsticks"], popularity_score: 60, is_essential: false },
      { name: "drinking straws", display_name: "Drinking Straws", amazon_search_terms: ["drinking straws", "paper straws", "reusable straws"], popularity_score: 65, is_essential: false },
      
      // Specialty Pans and Boards
      { name: "broiler pan", display_name: "Broiler Pan", amazon_search_terms: ["broiler pan", "roasting pan", "oven safe pan"], popularity_score: 60, is_essential: false },
      { name: "pizza board", display_name: "Pizza Board", amazon_search_terms: ["pizza board", "pizza peel", "wooden pizza board"], popularity_score: 50, is_essential: false },
      { name: "wire rack", display_name: "Wire Rack", amazon_search_terms: ["wire rack", "cooling rack", "baking rack"], popularity_score: 75, is_essential: false },
      { name: "sifter", display_name: "Sifter", amazon_search_terms: ["sifter", "flour sifter", "fine mesh sieve"], popularity_score: 60, is_essential: false },
      
      // Specialty Molds
      { name: "heart shaped silicone form", display_name: "Heart Shaped Silicone Form", amazon_search_terms: ["heart shaped mold", "silicone heart pan", "valentine cake pan"], popularity_score: 35, is_essential: false },
      { name: "silicone muffin liners", display_name: "Silicone Muffin Liners", amazon_search_terms: ["silicone muffin liners", "reusable baking cups", "silicone cupcake liners"], popularity_score: 65, is_essential: false },
      
      // Additional Specialty Items  
      { name: "blow torch", display_name: "Blow Torch", amazon_search_terms: ["culinary torch", "kitchen torch", "creme brulee torch"], popularity_score: 45, is_essential: false }
    ]

    const results = []
    let successCount = 0
    let failCount = 0

    for (const equipment of missingEquipment) {
      try {
        const { data, error } = await supabase
          .from('cooking_equipment')
          .insert([equipment])
          .select()
        
        if (error) {
          console.error(`Error inserting ${equipment.name}:`, error)
          results.push({ name: equipment.name, success: false, error: error.message })
          failCount++
        } else {
          results.push({ name: equipment.name, success: true, id: data[0]?.id })
          successCount++
        }
      } catch (err) {
        console.error(`Exception inserting ${equipment.name}:`, err)
        results.push({ name: equipment.name, success: false, error: String(err) })
        failCount++
      }
    }

    return NextResponse.json({
      message: `Equipment insertion complete: ${successCount} added, ${failCount} failed`,
      total_attempted: missingEquipment.length,
      success_count: successCount,
      fail_count: failCount,
      results,
      successful_additions: results.filter(r => r.success).map(r => r.name),
      failed_additions: results.filter(r => !r.success).map(r => ({ name: r.name, error: r.error }))
    })

  } catch (error) {
    console.error('Error in execute equipment SQL endpoint:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}