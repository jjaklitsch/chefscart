import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get all equipment from database
    const { data: existingEquipment, error } = await supabase
      .from('cooking_equipment')
      .select('name, display_name')
      .order('name')
    
    if (error) {
      console.error('Error fetching equipment:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Your comprehensive list of equipment
    const requiredEquipment = [
      'skimmer', 'pie form', 'glass baking pan', 'garlic press', 'meat grinder', 'tongs', 'bread knife',
      'tajine pot', 'wire rack', 'mincing knife', 'cherry pitter', 'wooden skewers', 'kitchen scissors',
      'blow torch', 'broiler pan', 'heart shaped silicone form', 'grill', 'immersion blender', 'baking sheet',
      'oven mitt', 'pastry bag', 'palette knife', 'pizza cutter', 'bottle opener', 'bowl', 'pizza pan',
      'candy thermometer', 'rolling pin', 'frying pan', 'casserole dish', 'plastic wrap', 'salad spinner',
      'broiler', 'silicone muffin tray', 'meat tenderizer', 'edible cake image', 'measuring spoon',
      'kitchen thermometer', 'sifter', 'muffin tray', 'chocolate mold', 'kitchen towels', 'potato ricer',
      'silicone kugelhopf pan', 'offset spatula', 'cheesecloth', 'lemon squeezer', 'cake form',
      'mini muffin tray', 'carving fork', 'egg slicer', 'ice cube tray', 'corkscrew', 'ice cream machine',
      'sieve', 'kugelhopf pan', 'pastry brush', 'popsicle sticks', 'spatula', 'cake server', 'poultry shears',
      'box grater', 'cupcake toppers', 'funnel', 'drinking straws', 'slotted spoon', 'ceramic pie form',
      'pepper grinder', 'mortar and pestle', 'baster', 'melon baller', 'zester', 'pastry cutter',
      'ziploc bags', 'aluminum foil', 'toothpicks', 'pot', 'baking pan', 'ladle', 'apple cutter',
      'fillet knife', 'toaster', 'heart shaped cake form', 'grill pan', 'wooden spoon', 'paper towels',
      'cookie cutter', 'tart form', 'pizza board', 'glass casserole dish', 'madeleine form', 'metal skewers',
      'microplane', 'stand mixer', 'whisk', 'mixing bowl', 'deep fryer', 'canning jar', 'cheese knife',
      'hand mixer', 'butter curler', 'food processor', 'wax paper', 'grater', 'gravy boat', 'muffin liners',
      'butter knife', 'waffle iron', 'double boiler', 'can opener', 'mandoline', 'kitchen twine', 'juicer',
      'wok', 'measuring cup', 'ramekin', 'airfryer', 'instant pot', 'spoon', 'dough scraper', 'microwave',
      'roasting pan', 'pressure cooker', 'dehydrator', 'baking paper', 'silicone muffin liners', 'loaf pan',
      'cake topper', 'dutch oven', 'baking spatula', 'popsicle molds', 'teapot', 'cocktail sticks', 'cleaver',
      'rice cooker', 'bread machine', 'fork', 'ice cream scoop', 'slow cooker', 'knife', 'kitchen scale',
      'griddle', 'frosting cake topper', 'cutting board', 'cake pop mold', 'oven', 'colander', 'kitchen timer',
      'panini press', 'pasta machine', 'popcorn maker', 'lollipop sticks', 'steamer basket', 'chopsticks',
      'chefs knife', 'blender', 'pizza stone', 'skewers', 'sauce pan', 'peeler', 'stove', 'pot holder',
      'springform pan', 'apple corer', 'potato masher', 'serrated knife'
    ]

    const existingNames = existingEquipment?.map(e => e.name.toLowerCase()) || []
    const missing = requiredEquipment.filter(item => !existingNames.includes(item.toLowerCase()))
    const existing = requiredEquipment.filter(item => existingNames.includes(item.toLowerCase()))

    return NextResponse.json({
      totalRequired: requiredEquipment.length,
      totalExisting: existingEquipment?.length || 0,
      existingCount: existing.length,
      missingCount: missing.length,
      missing: missing.sort(),
      existing: existing.sort(),
      databaseEquipment: existingEquipment
    })

  } catch (error) {
    console.error('Error in equipment debug endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}