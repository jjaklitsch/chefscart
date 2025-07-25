"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMealPlan = generateMealPlan;
const firestore_1 = require("firebase-admin/firestore");
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const db = (0, firestore_1.getFirestore)();
async function generateMealPlan(req, res) {
    var _a, _b;
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        console.log('Generating meal plan request:', req.body);
        const { userId, preferences, pantryItems = [] } = req.body;
        if (!userId || !preferences) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Create GPT prompt based on preferences
        const prompt = createMealPlanPrompt(preferences, pantryItems);
        console.log('GPT Prompt:', prompt);
        // Call OpenAI to generate meal plan
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert chef and nutritionist. Generate meal plans in valid JSON format only. No additional text or explanations.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 4000,
            response_format: { type: 'json_object' }
        });
        const mealPlanData = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
        if (!mealPlanData) {
            throw new Error('No response from OpenAI');
        }
        console.log('GPT Response:', mealPlanData);
        // Parse the JSON response
        let parsedPlan;
        try {
            parsedPlan = JSON.parse(mealPlanData);
        }
        catch (parseError) {
            console.error('Failed to parse GPT response:', parseError);
            throw new Error('Invalid JSON response from AI');
        }
        // Add 30-40% more recipes as backups
        const targetRecipes = preferences.mealsPerWeek;
        const backupCount = Math.ceil(targetRecipes * 0.35);
        const recipes = parsedPlan.recipes || [];
        const primaryRecipes = recipes.slice(0, targetRecipes);
        const backupRecipes = recipes.slice(targetRecipes, targetRecipes + backupCount);
        // Calculate estimated cost
        const subtotalEstimate = calculateEstimatedCost(primaryRecipes, preferences.peoplePerMeal);
        // Create meal plan document
        const mealPlan = {
            userId,
            recipes: primaryRecipes,
            backupRecipes,
            subtotalEstimate,
            ingredientMatchPct: 95, // Optimistic default
            status: 'draft',
            preferences,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // Save to Firestore
        const docRef = await db.collection('mealPlans').add(mealPlan);
        console.log('Meal plan saved with ID:', docRef.id);
        return res.status(200).json({
            success: true,
            planId: docRef.id,
            mealPlan: Object.assign(Object.assign({}, mealPlan), { id: docRef.id })
        });
    }
    catch (error) {
        console.error('Error generating meal plan:', error);
        return res.status(500).json({
            error: 'Failed to generate meal plan',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
function createMealPlanPrompt(preferences, pantryItems) {
    const { mealsPerWeek, peoplePerMeal, mealTypes, diets, allergies, avoidIngredients, maxCookTime, cookingSkillLevel, preferredCuisines } = preferences;
    // Generate 30-40% more recipes than needed for backups
    const totalRecipesToGenerate = Math.ceil(mealsPerWeek * 1.35);
    return `Generate ${totalRecipesToGenerate} diverse recipe ideas for meal planning with the following requirements:

REQUIREMENTS:
- ${mealsPerWeek} meals needed for ${peoplePerMeal} people
- Meal types: ${mealTypes.map((m) => m.type).join(', ')}
- Dietary restrictions: ${diets.length > 0 ? diets.join(', ') : 'None'}
- Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Avoid ingredients: ${avoidIngredients.length > 0 ? avoidIngredients.join(', ') : 'None'}
- Max cooking time: ${maxCookTime} minutes
- Cooking skill level: ${cookingSkillLevel}
- Preferred cuisines: ${preferredCuisines.length > 0 ? preferredCuisines.join(', ') : 'Any'}
- Pantry items already available: ${pantryItems.length > 0 ? pantryItems.join(', ') : 'None specified'}

INSTRUCTIONS:
1. Create recipes that match the dietary restrictions and preferences
2. Ensure cooking time is within the ${maxCookTime} minute limit
3. Match the ${cookingSkillLevel} skill level
4. Include detailed ingredient lists with quantities
5. Provide nutrition information (calories, protein, carbs, fat, fiber)
6. Estimate ingredient cost in USD
7. Exclude pantry items from shopping lists when possible
8. Vary cuisines and cooking methods for diversity

REQUIRED JSON FORMAT:
{
  "recipes": [
    {
      "id": "recipe-1",
      "title": "Recipe Name",
      "description": "One sentence description",
      "ingredients": [
        {
          "name": "ingredient name",
          "amount": 2,
          "unit": "cups",
          "category": "produce"
        }
      ],
      "instructions": ["Step 1", "Step 2", "Step 3"],
      "nutrition": {
        "calories": 450,
        "protein": 25,
        "carbs": 40,
        "fat": 18,
        "fiber": 8,
        "sugar": 12
      },
      "estimatedCost": 12.50,
      "cookTime": 25,
      "prepTime": 10,
      "servings": ${peoplePerMeal},
      "difficulty": "easy",
      "cuisine": "Italian",
      "tags": ["healthy", "quick"]
    }
  ]
}

Generate exactly ${totalRecipesToGenerate} recipes in this format.`;
}
function calculateEstimatedCost(recipes, servings) {
    if (!recipes || recipes.length === 0)
        return 0;
    return recipes.reduce((total, recipe) => {
        const recipeCost = recipe.estimatedCost || 0;
        return total + recipeCost;
    }, 0);
}
//# sourceMappingURL=gptPlan.js.map