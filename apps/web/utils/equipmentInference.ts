// Shared equipment inference logic for consistency between CookingEquipment component and recipe tags

interface Recipe {
  id: string
  title: string
  description?: string
  instructions_json?: {
    steps?: Array<{
      instruction?: string
      text?: string
      step_no?: number
      time_min?: number
    }>
  }
  courses?: string[]
  cuisines?: string[]
  cooking_difficulty?: string
}

export function inferEquipmentFromRecipe(recipe: Recipe): string[] {
  const equipment = new Set(['Knife', 'Cutting Board', 'Mixing Bowl']) // Essential basics
  
  // Analyze instructions for equipment clues
  const instructions = recipe.instructions_json?.steps || []
  const allInstructions = instructions.map(step => 
    (step.instruction || step.text || '').toLowerCase()
  ).join(' ')
  
  const title = recipe.title.toLowerCase()
  const description = (recipe.description || '').toLowerCase()
  const searchText = `${title} ${description} ${allInstructions}`
  
  // Equipment inference based on cooking methods
  if (searchText.includes('bake') || searchText.includes('oven') || searchText.includes('roast')) {
    equipment.add('Baking Sheet')
    equipment.add('Oven Mitts')
    equipment.add('Wire Rack')
  }
  
  if (searchText.includes('sauté') || searchText.includes('fry') || searchText.includes('pan')) {
    equipment.add('Skillet')
    equipment.add('Spatula')
    equipment.add('Tongs')
  }
  
  if (searchText.includes('boil') || searchText.includes('simmer') || searchText.includes('water')) {
    equipment.add('Saucepan')
    equipment.add('Stock Pot')
  }
  
  if (searchText.includes('grill') || searchText.includes('barbecue')) {
    equipment.add('Grill')
    equipment.add('Grill Tongs')
    equipment.add('Grill Brush')
  }
  
  if (searchText.includes('blend') || searchText.includes('smooth')) {
    equipment.add('Blender')
    equipment.add('Immersion Blender')
  }
  
  if (searchText.includes('whisk') || searchText.includes('beat') || searchText.includes('cream')) {
    equipment.add('Whisk')
    equipment.add('Electric Mixer')
  }
  
  if (searchText.includes('strain') || searchText.includes('drain')) {
    equipment.add('Strainer')
    equipment.add('Colander')
  }
  
  if (searchText.includes('measure') || recipe.cooking_difficulty === 'challenging') {
    equipment.add('Measuring Cups')
    equipment.add('Measuring Spoons')
    equipment.add('Kitchen Scale')
  }
  
  if (searchText.includes('thermometer') || searchText.includes('temperature')) {
    equipment.add('Kitchen Thermometer')
  }
  
  // Cuisine-specific equipment
  const cuisines = recipe.cuisines || []
  cuisines.forEach(cuisine => {
    const c = cuisine.toLowerCase()
    if (c.includes('italian')) {
      equipment.add('Grater')
      equipment.add('Pasta Machine')
    }
    if (c.includes('asian') || c.includes('chinese') || c.includes('thai')) {
      equipment.add('Wok')
      equipment.add('Rice Cooker')
      equipment.add('Steamer Basket')
    }
    if (c.includes('mexican')) {
      equipment.add('Molcajete')
      equipment.add('Tortilla Press')
    }
    if (c.includes('indian')) {
      equipment.add('Spice Grinder')
      equipment.add('Pressure Cooker')
    }
  })
  
  // Course-specific equipment
  const courses = recipe.courses || []
  courses.forEach(course => {
    const c = course.toLowerCase()
    if (c.includes('dessert')) {
      equipment.add('Stand Mixer')
      equipment.add('Pastry Brush')
      equipment.add('Rolling Pin')
    }
    if (c.includes('soup')) {
      equipment.add('Ladle')
      equipment.add('Immersion Blender')
    }
  })
  
  // Convert Set to Array and limit to reasonable number
  return Array.from(equipment).slice(0, 15)
}