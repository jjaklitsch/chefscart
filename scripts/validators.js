// validators.js - Robust validation and normalization for meal data

const allowed = {
  cuisines: ['american','caribbean','chinese','french','indian','italian','japanese','korean','mediterranean','mexican','southern','thai','vietnamese'],
  diets: ['keto','low-carb','mediterranean','paleo','pescatarian','plant-forward','vegan','vegetarian','whole30'],
  ingredients: ['chicken','beef','salmon','shrimp','tofu','tempeh','beans','lentils','eggs','pasta','rice','bread','none'], // Expanded from proteins to ingredients
  allergens: ['dairy','egg','gluten','grain','peanut','seafood','sesame','shellfish','soy'],
  cost: ['$', '$$', '$$$'], // Fixed: added $$$
  units: ['g','ml','cup','tbsp','tsp','oz','lb','each','clove','pinch']
};

/**
 * Extract JSON from model response, handling code fences and malformed output
 */
function extractJSON(response) {
  if (!response || typeof response !== 'string') {
    throw new Error('Invalid response: expected string');
  }

  // Strip code fences
  let cleaned = response.replace(/```(?:json)?/gi, '```');
  const fenceMatch = cleaned.match(/```([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1] : cleaned;
  
  // Try to find a complete JSON object by counting braces
  let braceCount = 0;
  let start = -1;
  let end = -1;
  
  for (let i = 0; i < candidate.length; i++) {
    if (candidate[i] === '{') {
      if (start === -1) start = i;
      braceCount++;
    } else if (candidate[i] === '}') {
      braceCount--;
      if (braceCount === 0 && start !== -1) {
        end = i;
        break;
      }
    }
  }
  
  if (start >= 0 && end > start) {
    try {
      const jsonStr = candidate.slice(start, end + 1);
      return JSON.parse(jsonStr);
    } catch (e) {
      // If balanced extraction fails, try original approach
      console.warn('Balanced JSON extraction failed, trying fallback methods...');
    }
  }
  
  // Fallback: try simple start/end approach
  const simpleStart = candidate.indexOf('{');
  const simpleEnd = candidate.lastIndexOf('}');
  
  if (simpleStart >= 0 && simpleEnd > simpleStart) {
    try {
      return JSON.parse(candidate.slice(simpleStart, simpleEnd + 1));
    } catch (e) {
      // Try full candidate if slice fails
      try {
        return JSON.parse(candidate.trim());
      } catch (e2) {
        throw new Error(`Failed to parse JSON. Original error: ${e.message}. Fallback error: ${e2.message}`);
      }
    }
  }
  
  // Last resort: parse as-is
  return JSON.parse(candidate.trim());
}

/**
 * Normalize array field to lowercase, dedupe, and filter by allowed values
 * If no allowedSet provided, don't filter (for ingredient_tags and search_keywords)
 */
function normLowerArray(arr, allowedSet) {
  const normalized = new Set();
  (arr || []).forEach(value => {
    if (!value) return;
    const cleaned = String(value).toLowerCase().trim();
    if (!allowedSet || allowedSet.has(cleaned)) {
      normalized.add(cleaned);
    }
  });
  return [...normalized];
}

/**
 * Generate URL-safe slug from title
 */
function generateSlug(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'untitled';
}

/**
 * Normalize and validate meal data
 */
function normalize(meal) {
  if (!meal || typeof meal !== 'object') {
    throw new Error('Invalid meal data: expected object');
  }

  // Generate slug if missing
  meal.slug = meal.slug || generateSlug(meal.title);

  // Normalize array fields
  meal.cuisines = normLowerArray(meal.cuisines, new Set(allowed.cuisines));
  meal.diets_supported = normLowerArray(meal.diets_supported, new Set(allowed.diets));
  meal.allergens_present = normLowerArray(meal.allergens_present, new Set(allowed.allergens));
  meal.courses = normLowerArray(meal.courses, new Set(['breakfast', 'lunch', 'dinner', 'snack']));
  meal.search_keywords = normLowerArray(meal.search_keywords); // No filtering - accept all
  meal.ingredient_tags = normLowerArray(meal.ingredient_tags); // No filtering - accept all

  // Primary ingredient - accept whatever AI provides (no restrictive mapping)
  const ingredient = (meal.primary_ingredient || meal.primary_protein || '').toLowerCase().trim();
  if (ingredient) {
    meal.primary_ingredient = ingredient; // Accept AI's assessment
  } else {
    meal.primary_ingredient = 'none'; // Default fallback only if empty
  }
  delete meal.primary_protein; // Remove old field if present

  // Cost scale validation
  if (!allowed.cost.includes(meal.cost_per_serving)) {
    meal.cost_per_serving = '$'; // Default to cheapest
  }

  // Spice level clamp (1-5)
  meal.spice_level = Math.min(5, Math.max(1, Number(meal.spice_level || 3)));

  // Time validation and correction
  const stepSum = (meal.instructions_json?.steps || []).reduce((sum, step) => {
    return sum + (Number(step.time_min) || 0);
  }, 0);
  
  if (stepSum > 0) {
    if (Math.abs(meal.time_total_min - stepSum) > 5) {
      console.warn(`⚠️  Time mismatch for ${meal.title}: declared ${meal.time_total_min}min, steps sum to ${stepSum}min. Using step sum.`);
    }
    meal.time_total_min = stepSum;
    meal.instructions_json.time_total_min = stepSum;
  }

  // Servings validation and bounds
  const defaultServings = Math.max(1, Number(meal.servings_default || 2));
  const minServings = Math.max(1, Number(meal.servings_min || defaultServings));
  const maxServings = Math.max(minServings, Math.min(12, Number(meal.servings_max || Math.max(defaultServings, 4))));
  
  meal.servings_default = defaultServings;
  meal.servings_min = minServings;
  meal.servings_max = maxServings;

  // Ensure servings logic is consistent
  if (meal.servings_default < meal.servings_min || meal.servings_default > meal.servings_max) {
    meal.servings_default = Math.max(meal.servings_min, Math.min(meal.servings_max, meal.servings_default));
  }

  // Normalize ingredients
  (meal.ingredients_json?.ingredients || []).forEach(ingredient => {
    // Unit normalization
    if (ingredient.unit) {
      ingredient.unit = String(ingredient.unit).toLowerCase().trim();
      if (!allowed.units.includes(ingredient.unit)) {
        ingredient.unit = 'g'; // Conservative default
      }
    }
    
    // Numeric conversions
    if (ingredient.quantity != null) ingredient.quantity = Number(ingredient.quantity) || 0;
    if (ingredient.grams != null) ingredient.grams = Number(ingredient.grams) || null;
    if (ingredient.ml != null) ingredient.ml = Number(ingredient.ml) || null;
    
    // Boolean conversion
    ingredient.optional = Boolean(ingredient.optional);
  });

  // Normalize instruction steps
  (meal.instructions_json?.steps || []).forEach(step => {
    step.step_no = Number(step.step_no) || 1;
    step.time_min = Number(step.time_min) || 0;
  });

  // Ensure servings in ingredients_json matches default
  if (meal.ingredients_json) {
    meal.ingredients_json.servings = meal.servings_default;
  }

  return meal;
}

/**
 * Validate required fields are present
 */
function validateRequired(meal) {
  const required = [
    'slug', 'title', 'description', 'courses', 'cuisines', 
    'time_total_min', 'ingredients_json', 'instructions_json'
  ];
  
  for (const field of required) {
    if (!meal[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate nested required fields
  if (!meal.ingredients_json.ingredients || !Array.isArray(meal.ingredients_json.ingredients)) {
    throw new Error('ingredients_json must contain an ingredients array');
  }

  if (!meal.instructions_json.steps || !Array.isArray(meal.instructions_json.steps)) {
    throw new Error('instructions_json must contain a steps array');
  }

  return true;
}

module.exports = { 
  extractJSON, 
  normalize, 
  validateRequired, 
  generateSlug,
  allowed 
};