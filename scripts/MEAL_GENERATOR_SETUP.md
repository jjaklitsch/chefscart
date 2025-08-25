# ChefsCart Meal Data Generator Setup

This guide walks you through setting up the meal data generation system using ChatGPT-5 and Supabase.

## Prerequisites

✅ Node.js 18+ installed
✅ OpenAI API key with access to GPT-4 (GPT-5 when available)  
✅ Supabase project with database access

## 1. Supabase Database Setup

### Create the meals table

1. Go to your Supabase dashboard → SQL Editor
2. Run the schema from `scripts/supabase-meals-schema.sql`
3. Verify the table was created successfully

### Get Supabase credentials

You'll need:
- **Supabase URL**: Found in Project Settings → API
- **Service Role Key**: Found in Project Settings → API (anon key also works for testing)

## 2. Environment Variables

Add these to your `.env.local` file:

```bash
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Supabase (use one of these patterns)
# Option 1: Standard Supabase env vars
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Option 2: Next.js style (alternative)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

## 3. Install Dependencies

Dependencies are already installed if you ran the setup. If needed:

```bash
npm install openai @supabase/supabase-js dotenv
```

## 4. Run the Generator

### Test with sample meals:

```bash
npm run generate-meals
```

This will process the 2 test meals:
- Low-Carb Baked Cod with Ratatouille
- Niçoise Salad Bowl

### Custom meal list:

Edit the `TEST_MEALS` array in `scripts/generate-meal-data.js`:

```javascript
const TEST_MEALS = [
  'Your Meal Name 1',
  'Your Meal Name 2',
  // Add more meals...
];
```

## 5. Output

The script will:
- ✅ Generate comprehensive meal data using ChatGPT-4
- ✅ Store data in Supabase `meals` table
- ✅ Save JSON backups to `scripts/generated-meals/`
- ✅ Provide detailed console output and error handling

## 6. Data Schema

Each generated meal includes:

```javascript
{
  "slug": "meal-url-slug",
  "title": "Meal Title",
  "description": "Appetizing description...",
  "courses": ["lunch", "dinner"],
  "cuisines": ["Mediterranean", "French"],
  "diets_supported": ["mediterranean"], // strict compliance
  "dish_category": "Salad",
  "primary_protein": "Fish",
  "spice_level": 2,
  "time_total_min": 25,
  "servings_default": 2,
  "cost_per_serving": "$",
  "allergens_present": ["Fish"],
  "search_keywords": ["cod", "ratatouille", "low-carb", ...],
  "ingredients_json": {
    "servings": 2,
    "ingredients": [...]
  },
  "instructions_json": {
    "time_total_min": 25,
    "steps": [...]
  }
}
```

## 7. Querying Meals

Once generated, you can query meals by user preferences:

```sql
-- Find meals by cuisine
SELECT * FROM meals WHERE 'Mediterranean' = ANY(cuisines);

-- Find low-spice meals
SELECT * FROM meals WHERE spice_level <= 2;

-- Find quick meals
SELECT * FROM meals WHERE time_total_min <= 30;

-- Find meals by multiple criteria
SELECT * FROM meals 
WHERE 'Mediterranean' = ANY(cuisines)
  AND spice_level <= 3
  AND time_total_min <= 30
  AND NOT ('Dairy' = ANY(allergens_present));
```

## 8. Integration with Onboarding

The generated meals will be used to match user preferences from the onboarding flow:

- **Cuisines**: Match `cuisinePreferences`
- **Spice Level**: Match `spiceTolerance` 
- **Cooking Time**: Match `cookingTimePreference`
- **Diets**: Match `dietaryStyle`
- **Allergens**: Exclude based on `foodsToAvoid`
- **Proteins**: Match `favoriteFoods`

## Troubleshooting

### Common Issues:

**❌ OpenAI API Error**: Check your API key and quota
**❌ Supabase Error**: Verify URL and key are correct
**❌ JSON Parse Error**: OpenAI sometimes returns malformed JSON - script will retry
**❌ Missing Fields**: Script validates required fields and will error if missing

### Debug Mode:

Add console logs to see raw OpenAI responses:

```javascript
console.log('Raw OpenAI response:', response);
```

## Cost Estimation

- **OpenAI**: ~$0.02-0.05 per meal (GPT-4 pricing)
- **Supabase**: Free tier supports 500MB database
- **Total for 500 meals**: ~$10-25 in OpenAI costs

## Scaling to 500+ Meals

For larger batches:

1. **Rate Limiting**: Add delays between requests
2. **Batch Processing**: Process in chunks of 10-20 meals
3. **Error Recovery**: Save progress and resume on failures  
4. **Data Validation**: Add more comprehensive validation
5. **Cost Management**: Monitor OpenAI usage

Ready to generate your meal database! 🚀