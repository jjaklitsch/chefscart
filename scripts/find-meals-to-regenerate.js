import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../apps/web/.env.local') });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// List of meals to regenerate (some may be partial names)
const mealsToRegenerate = [
  "Cold Soba with Dipping Sauce",
  "Coconut Rice with Grilled Prawns and Vegetables",
  "Complete Galbi (Short Ribs) with Vegetables",
  "Complete Catfish Po'boy with Side Salad",
  "Complete Samgyeopsal (Pork Belly) Wraps with",
  "Falafel Mezze Bowl",
  "Herbed Yogurt Veggie Wrap with Whole Grain",
  "Herbed White Bean Breakfast Toast",
  "Jerk Shrimp Tacos with Pineapple",
  "Keto Caprese Chicken (No Balsamic)",
  "Kimchi Fried Rice with Egg",
  "Lasagna Roll-Ups with Spinach and Ricotta",
  "Lentil Bolognese over Whole-Wheat Pasta",
  "Low-Carb Orange-Ginger Beef & Broccoli with",
  "Olive Tapenade & Egg Toast with Fresh",
  "Roasted Pepper & Mozzarella Breakfast Wra",
  "Roasted Cauliflower, Olives & Capers with",
  "Roasted Veg & Hummus Plate with Extra Pita",
  "Smash Burger with Special Sauce",
  "Smoked Mackerel & Egg Breakfast Bowl",
  "Som Tam with Grilled Chicken and Jasmine Rice",
  "Spring Onion Oil Noodles with Tofu",
  "Strawberry Pistachio Goat Cheese Salad",
  "Teriyaki Meatballs Skewers with Rice and Vegetables",
  "Thịt Kho Trứng (Complete Pork & Egg Caramelized",
  "Tofu Katsu Curry with Vegetable Medley",
  "Tom Kha Gai (Coconut Soup) with Jasmine Rice",
  "Tomato Soup & Grilled Cheese with Lentils",
  "Vegan Stuffed Peppers with Rice",
  "Vegetarian Sushi Bowl",
  "Watermelon–Feta–Mint Salad (Lime Vinaigrette)",
  "Cheese Enchiladas Verde with Black Beans and Rice",
  "Avocado Ranch Chicken Grain Bowl"
];

async function findMealsToRegenerate() {
  console.log('🔍 Finding meals to regenerate...\n');
  
  const foundMeals = [];
  const notFoundMeals = [];
  
  for (const searchTerm of mealsToRegenerate) {
    // Try exact match first
    let { data: meal, error } = await supabase
      .from('meals')
      .select('id, title, image_url, image_generation_model')
      .eq('title', searchTerm)
      .single();
    
    // If no exact match, try partial match
    if (!meal || error) {
      const { data: partialMatches } = await supabase
        .from('meals')
        .select('id, title, image_url, image_generation_model')
        .ilike('title', `${searchTerm}%`);
      
      if (partialMatches && partialMatches.length > 0) {
        meal = partialMatches[0]; // Take first match
      }
    }
    
    if (meal) {
      foundMeals.push({
        id: meal.id,
        title: meal.title,
        searchTerm: searchTerm,
        hasImage: !!meal.image_url,
        currentModel: meal.image_generation_model
      });
      console.log(`✅ Found: "${searchTerm}" -> "${meal.title}" (ID: ${meal.id})`);
    } else {
      notFoundMeals.push(searchTerm);
      console.log(`❌ Not found: "${searchTerm}"`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Found: ${foundMeals.length} meals`);
  console.log(`❌ Not found: ${notFoundMeals.length} meals\n`);
  
  if (notFoundMeals.length > 0) {
    console.log('⚠️ Meals not found (check spelling):');
    notFoundMeals.forEach(meal => console.log(`  - ${meal}`));
    console.log('');
  }
  
  // Export the IDs for regeneration
  const mealIds = foundMeals.map(m => m.id);
  console.log('📝 Meal IDs for regeneration:');
  console.log(JSON.stringify(mealIds, null, 2));
  
  // Save to file for the regeneration script
  const fs = await import('fs/promises');
  await fs.writeFile(
    join(__dirname, 'meals-to-regenerate.json'),
    JSON.stringify({
      meals: foundMeals,
      ids: mealIds,
      notFound: notFoundMeals
    }, null, 2)
  );
  
  console.log('\n💾 Saved to meals-to-regenerate.json');
  
  return { foundMeals, notFoundMeals, mealIds };
}

// Run the search
findMealsToRegenerate().catch(console.error);