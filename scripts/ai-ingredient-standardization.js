/**
 * AI-Powered Ingredient Standardization Script
 * 
 * Analyzes ingredients in the context of actual meal recipes to make intelligent
 * consolidation decisions. Distinguishes between different cuts, forms, and 
 * preparations that require different store products while consolidating variants
 * of the same purchasable item.
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Fetch all meals with their ingredients from Supabase
 */
async function fetchMealsData() {
  console.log('📊 Fetching meals data from Supabase...');
  
  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, title, ingredients_json, instructions_json, cuisines, primary_ingredient')
    .order('title')
; // Process all meals
    
  if (error) {
    throw new Error(`Failed to fetch meals: ${error.message}`);
  }
  
  console.log(`✅ Fetched ${meals.length} meals from database`);
  return meals;
}

/**
 * Extract and group ingredients by potential consolidation candidates
 */
function groupIngredientsByPotentialConsolidation(meals) {
  console.log('🔍 Analyzing and grouping ingredients...');
  
  const ingredientGroups = new Map();
  const ingredientMealContext = new Map();
  
  meals.forEach(meal => {
    const ingredients = meal.ingredients_json?.ingredients || [];
    
    ingredients.forEach(ingredient => {
      const shoppableName = ingredient.shoppable_name;
      const displayName = ingredient.display_name;
      
      // Skip ingredients without shoppable_name
      if (!shoppableName) {
        console.log(`⚠️ Skipping ingredient without shoppable_name in meal "${meal.title}":`, ingredient);
        return;
      }
      
      // Track which meals use this ingredient for context
      const mealContext = {
        mealTitle: meal.title,
        mealCuisines: meal.cuisines,
        primaryIngredient: meal.primary_ingredient,
        displayName: displayName,
        category: ingredient.category,
        notes: ingredient.notes || '',
        unit: ingredient.unit,
        quantity: ingredient.quantity
      };
      
      if (!ingredientMealContext.has(shoppableName)) {
        ingredientMealContext.set(shoppableName, []);
      }
      ingredientMealContext.get(shoppableName).push(mealContext);
      
      // Group ingredients by base words for consolidation analysis
      const baseWords = extractBaseWords(shoppableName.toLowerCase());
      const groupKey = baseWords.join(' ');
      
      if (!ingredientGroups.has(groupKey)) {
        ingredientGroups.set(groupKey, new Set());
      }
      ingredientGroups.get(groupKey).add(shoppableName);
    });
  });
  
  // Filter to groups with multiple variants (potential consolidation candidates)
  const consolidationCandidates = new Map();
  for (const [groupKey, ingredients] of ingredientGroups) {
    if (ingredients.size > 1) {
      consolidationCandidates.set(groupKey, Array.from(ingredients));
    }
  }
  
  console.log(`🎯 Found ${consolidationCandidates.size} ingredient groups with potential consolidation candidates`);
  return { consolidationCandidates, ingredientMealContext };
}

/**
 * Extract base words from ingredient names for grouping
 */
function extractBaseWords(ingredientName) {
  // Remove common modifiers and descriptors
  const modifiers = [
    'fresh', 'dried', 'frozen', 'canned', 'organic', 'raw', 'cooked',
    'sliced', 'diced', 'chopped', 'minced', 'ground', 'whole', 'pieces',
    'boneless', 'bone-in', 'skinless', 'with skin', 'large', 'medium', 'small',
    'extra', 'virgin', 'light', 'dark', 'white', 'red', 'green', 'yellow',
    'unsalted', 'salted', 'low-sodium', 'reduced', 'fat-free', 'low-fat'
  ];
  
  let cleaned = ingredientName.toLowerCase();
  
  // Remove parenthetical information
  cleaned = cleaned.replace(/\([^)]*\)/g, '').trim();
  
  // Remove common modifiers
  modifiers.forEach(modifier => {
    const regex = new RegExp(`\\b${modifier}\\b`, 'g');
    cleaned = cleaned.replace(regex, '').trim();
  });
  
  // Split into words and remove empty strings
  return cleaned.split(/\s+/).filter(word => word.length > 0);
}

/**
 * Use AI to analyze ingredient groups and make consolidation decisions
 */
async function analyzeIngredientGroupWithAI(groupKey, ingredients, mealContextMap) {
  console.log(`🤖 Analyzing group: "${groupKey}" with ingredients: [${ingredients.join(', ')}]`);
  
  // Get meal contexts for all ingredients in this group
  const contexts = [];
  ingredients.forEach(ingredient => {
    const meals = mealContextMap.get(ingredient) || [];
    meals.forEach(meal => {
      contexts.push({
        ingredient: ingredient,
        displayName: meal.displayName,
        mealTitle: meal.mealTitle,
        category: meal.category,
        notes: meal.notes,
        unit: meal.unit,
        cuisines: meal.mealCuisines
      });
    });
  });
  
  // Limit contexts to avoid token limits (max 10 per ingredient)
  const limitedContexts = contexts.slice(0, Math.min(50, contexts.length));
  
  const prompt = `You are an expert food analyst helping to standardize ingredients for a grocery shopping app. 

TASK: Analyze these ingredient variations and determine if they should be consolidated into a single "shoppable" product or kept separate.

INGREDIENT VARIATIONS TO ANALYZE:
${ingredients.map(ing => `- "${ing}"`).join('\n')}

MEAL CONTEXTS WHERE THESE ARE USED:
${limitedContexts.map(ctx => 
  `• "${ctx.ingredient}" (displayed as: "${ctx.displayName}") in meal: "${ctx.mealTitle}"
    Category: ${ctx.category}, Unit: ${ctx.unit}
    Notes: ${ctx.notes || 'None'}
    Cuisines: ${ctx.cuisines?.join(', ') || 'None'}`
).join('\n')}

CONSOLIDATION CRITERIA:
✅ CONSOLIDATE if they represent the SAME purchasable store product:
- Different brand names for same product
- Minor variations in naming (e.g., "Fresh Basil" vs "Basil" vs "Fresh Basil Leaves")
- Different preparation states of same base ingredient that shoppers buy as one item

❌ KEEP SEPARATE if they are DIFFERENT purchasable store products:
- Different cuts of meat (breast vs thigh vs whole chicken)
- Different forms (ground vs whole vs liquid like stock/broth)
- Different product types (e.g., chicken meat vs chicken stock)
- Different preparation methods requiring different purchases
- Items that would be in different store sections

RESPOND WITH JSON:
{
  "decision": "consolidate" | "keep_separate",
  "reasoning": "Brief explanation of why",
  "standardized_name": "If consolidating, the best name to use",
  "separate_items": ["If keeping separate, list each distinct item"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500
    });
    
    let content = response.choices[0].message.content.trim();
    
    // Remove markdown code block formatting if present
    if (content.startsWith('```json')) {
      content = content.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
    } else if (content.startsWith('```')) {
      content = content.replace(/```\s*/, '').replace(/```\s*$/, '').trim();
    }
    
    const result = JSON.parse(content);
    return result;
  } catch (error) {
    console.error(`❌ Error analyzing group "${groupKey}":`, error.message);
    return {
      decision: "keep_separate",
      reasoning: "Error in AI analysis, keeping items separate for safety",
      separate_items: ingredients
    };
  }
}

/**
 * Process all ingredient groups with AI analysis
 */
async function processIngredientGroups(consolidationCandidates, ingredientMealContext) {
  console.log('🔬 Starting AI analysis of ingredient groups...');
  
  const results = {
    consolidations: [],
    separations: [],
    mapping: new Map()
  };
  
  let processed = 0;
  const total = consolidationCandidates.size;
  
  for (const [groupKey, ingredients] of consolidationCandidates) {
    processed++;
    console.log(`\n[${processed}/${total}] Processing group: ${groupKey}`);
    
    const analysis = await analyzeIngredientGroupWithAI(
      groupKey, 
      ingredients, 
      ingredientMealContext
    );
    
    if (analysis.decision === 'consolidate') {
      console.log(`✅ CONSOLIDATING: ${ingredients.join(' + ')} → "${analysis.standardized_name}"`);
      results.consolidations.push({
        groupKey,
        originalIngredients: ingredients,
        standardizedName: analysis.standardized_name,
        reasoning: analysis.reasoning
      });
      
      // Add mappings
      ingredients.forEach(ingredient => {
        results.mapping.set(ingredient, analysis.standardized_name);
      });
    } else {
      console.log(`❌ KEEPING SEPARATE: [${ingredients.join(', ')}] - ${analysis.reasoning}`);
      results.separations.push({
        groupKey,
        ingredients: analysis.separate_items || ingredients,
        reasoning: analysis.reasoning
      });
      
      // Keep original mappings
      ingredients.forEach(ingredient => {
        results.mapping.set(ingredient, ingredient);
      });
    }
    
    // Rate limiting to avoid API issues - be more conservative
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms between each request
  }
  
  console.log('\n🎉 AI analysis complete!');
  console.log(`📈 Consolidations: ${results.consolidations.length}`);
  console.log(`📌 Kept separate: ${results.separations.length}`);
  
  return results;
}

/**
 * Generate comprehensive reports
 */
async function generateReports(results, ingredientMealContext) {
  console.log('📝 Generating standardization reports...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Summary report
  const summaryReport = {
    metadata: {
      generated_at: new Date().toISOString(),
      total_consolidations: results.consolidations.length,
      total_separations: results.separations.length,
      total_mappings: results.mapping.size
    },
    consolidations: results.consolidations,
    separations: results.separations
  };
  
  await fs.writeFile(
    path.join(__dirname, `ingredient-standardization-summary-${timestamp}.json`),
    JSON.stringify(summaryReport, null, 2)
  );
  
  // Complete mapping file for implementation
  const mappingArray = [];
  for (const [original, standardized] of results.mapping) {
    const usageCount = ingredientMealContext.get(original)?.length || 0;
    mappingArray.push({
      original_name: original,
      standardized_name: standardized,
      used_in_meals: usageCount,
      changed: original !== standardized
    });
  }
  
  // Sort by usage frequency
  mappingArray.sort((a, b) => b.used_in_meals - a.used_in_meals);
  
  await fs.writeFile(
    path.join(__dirname, `ingredient-mapping-${timestamp}.json`),
    JSON.stringify(mappingArray, null, 2)
  );
  
  // Human-readable report
  const humanReport = `# AI-Powered Ingredient Standardization Report
Generated: ${new Date().toISOString()}

## Summary
- **Total Consolidations:** ${results.consolidations.length}
- **Total Separations:** ${results.separations.length}  
- **Total Ingredients Analyzed:** ${results.mapping.size}

## Consolidations Made
${results.consolidations.map(cons => 
  `### ${cons.groupKey}
  **Before:** ${cons.originalIngredients.join(', ')}
  **After:** ${cons.standardizedName}
  **Reasoning:** ${cons.reasoning}
  `
).join('\n')}

## Items Kept Separate
${results.separations.map(sep => 
  `### ${sep.groupKey}
  **Items:** ${sep.ingredients.join(', ')}
  **Reasoning:** ${sep.reasoning}
  `
).join('\n')}

## Implementation
Use the \`ingredient-mapping-${timestamp}.json\` file to update your database with the new standardized ingredient names.
`;
  
  await fs.writeFile(
    path.join(__dirname, `ingredient-standardization-report-${timestamp}.md`),
    humanReport
  );
  
  console.log(`✅ Reports generated:`);
  console.log(`   📊 Summary: ingredient-standardization-summary-${timestamp}.json`);
  console.log(`   🗂️ Mapping: ingredient-mapping-${timestamp}.json`);
  console.log(`   📖 Report: ingredient-standardization-report-${timestamp}.md`);
  
  return timestamp;
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 Starting AI-powered ingredient standardization...\n');
    
    // Step 1: Fetch meals data
    const meals = await fetchMealsData();
    
    // Step 2: Group ingredients by potential consolidation
    const { consolidationCandidates, ingredientMealContext } = groupIngredientsByPotentialConsolidation(meals);
    
    // Step 3: Analyze groups with AI
    const results = await processIngredientGroups(consolidationCandidates, ingredientMealContext);
    
    // Step 4: Generate reports
    const timestamp = await generateReports(results, ingredientMealContext);
    
    console.log('\n🎉 Ingredient standardization complete!');
    console.log('🔍 Review the generated reports to see consolidation decisions.');
    console.log('🛠️ Use the mapping file to implement changes in your database.');
    
  } catch (error) {
    console.error('❌ Error during standardization:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  fetchMealsData,
  groupIngredientsByPotentialConsolidation,
  analyzeIngredientGroupWithAI,
  processIngredientGroups,
  generateReports
};