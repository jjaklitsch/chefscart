import * as React from 'react'

// Helper function to convert text to title case
function toTitleCase(str: string): string {
  if (!str) return str
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

// Helper function to extract cooking equipment from meals
function extractCookingEquipment(meals: Array<{ title: string; description: string }>): Array<{ name: string; category: string }> {
  const equipmentMap = new Map<string, string>()
  
  // Common equipment keywords and their categories
  const equipmentKeywords = {
    'frying pan': 'cookware-pans',
    'skillet': 'cookware-pans', 
    'pan': 'cookware-pans',
    'saucepan': 'cookware-pans',
    'pot': 'cookware-pans',
    'dutch oven': 'cookware-pans',
    'wok': 'cookware-pans',
    'baking sheet': 'baking',
    'sheet pan': 'baking',
    'baking dish': 'baking',
    'casserole dish': 'baking',
    'mixing bowl': 'tools-gadgets',
    'whisk': 'tools-gadgets',
    'spatula': 'tools-gadgets',
    'tongs': 'tools-gadgets',
    'knife': 'cutlery',
    'cutting board': 'cutting-boards',
    'blender': 'small-appliances',
    'food processor': 'small-appliances',
    'oven': 'cookware-pans',
    'grill': 'grilling'
  }

  // Check each meal for equipment keywords
  meals.forEach(meal => {
    const text = `${meal.title} ${meal.description}`.toLowerCase()
    
    Object.entries(equipmentKeywords).forEach(([equipment, category]) => {
      if (text.includes(equipment) && !equipmentMap.has(equipment)) {
        equipmentMap.set(equipment, category)
      }
    })
  })

  // Convert to array and limit to 6 items
  return Array.from(equipmentMap.entries())
    .map(([name, category]) => ({ name: toTitleCase(name), category }))
    .slice(0, 6)
}

export interface MealPlanEmailData {
  userEmail: string
  cartUrl: string
  totalServings: number
  meals: Array<{
    id: string
    title: string
    description: string
    cuisine: string
    mealType: string
    cookTime: number
    prepTime: number
    servings: number
    slug?: string
    cookingDifficulty?: string
    ingredients: Array<{
      name: string
      amount: number
      unit: string
    }>
  }>
  consolidatedCart: Array<{
    name: string
    shoppableName?: string
    shoppingQuantity: number
    shoppingUnit: string
    category?: string
    usedIn: string[]
  }>
}

export const MealPlanEmailTemplate = ({ 
  userEmail, 
  cartUrl, 
  totalServings,
  meals, 
  consolidatedCart 
}: MealPlanEmailData) => (
  <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
    {/* Header */}
    <div style={{ backgroundColor: '#10b981', padding: '32px 24px', textAlign: 'center' }}>
      <h1 style={{ color: 'white', margin: '0', fontSize: '32px', fontWeight: 'bold' }}>
        ChefsCart
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.9)', margin: '8px 0 0', fontSize: '18px' }}>
        Your Personalized Meal Plan is Ready!
      </p>
    </div>

    {/* Main Content */}
    <div style={{ padding: '32px 24px', backgroundColor: 'white' }}>
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151', margin: '0 0 24px' }}>
        Hi there! 👋
      </p>
      
      <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151', margin: '0 0 24px' }}>
        We've created your personalized meal plan with <strong>{meals.length} delicious recipes</strong> and 
        organized all your ingredients into a smart shopping list.
      </p>

      {/* Instacart CTA */}
      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <a 
          href={cartUrl}
          style={{
            display: 'inline-block',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '16px 32px',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        >
          Shop Your Ingredients on Instacart
        </a>
      </div>

      {/* Meal Summary */}
      <div style={{ margin: '32px 0' }}>
        <h2 style={{ color: '#1f2937', fontSize: '24px', fontWeight: 'bold', margin: '0 0 16px' }}>
          Your Meal Plan
        </h2>
        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
          {meals.map((meal, index) => (
            <div key={meal.id} style={{ marginBottom: index < meals.length - 1 ? '16px' : '0', paddingBottom: index < meals.length - 1 ? '16px' : '0', borderBottom: index < meals.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
              <h3 style={{ color: '#10b981', fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px' }}>
                {meal.title}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px' }}>
                {meal.cuisine} • {meal.mealType} • {meal.prepTime}m prep + {meal.cookTime}m cook • Serves {meal.servings}
              </p>
              <p style={{ color: '#374151', fontSize: '14px', margin: '0 0 8px', lineHeight: '1.5' }}>
                {meal.description}
              </p>
              <p style={{ color: '#10b981', fontSize: '14px', margin: '0', fontWeight: '600' }}>
                📖 <a href={`https://chefscart.ai/recipes/${meal.slug || meal.id}`} style={{ color: '#10b981', textDecoration: 'none' }}>
                  Get cooking instructions →
                </a>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Shopping List Preview */}
      <div style={{ margin: '32px 0' }}>
        <h2 style={{ color: '#1f2937', fontSize: '24px', fontWeight: 'bold', margin: '0 0 16px' }}>
          Smart Shopping List ({consolidatedCart.length} items)
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px' }}>
          We've consolidated ingredients across your meals and optimized quantities for {totalServings} total servings.
        </p>
        <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          {consolidatedCart.slice(0, 10).map((item, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: index < Math.min(consolidatedCart.length, 10) - 1 ? '8px' : '0' }}>
              <span style={{ color: '#374151', fontSize: '14px' }}>
                {item.shoppableName || item.name}
              </span>
              <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>
                {item.shoppingQuantity} {item.shoppingUnit}
              </span>
            </div>
          ))}
          {consolidatedCart.length > 10 && (
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <span style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                + {consolidatedCart.length - 10} more items
              </span>
            </div>
          )}
        </div>
        
        {/* Additional Instacart CTA after shopping list */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a 
            href={cartUrl}
            style={{
              display: 'inline-block',
              backgroundColor: '#10b981',
              color: 'white',
              padding: '12px 24px',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            Shop your ingredients on Instacart
          </a>
        </div>
      </div>

      {/* Tips */}
      <div style={{ backgroundColor: '#fffbeb', padding: '16px', borderRadius: '8px', border: '1px solid #fde68a', margin: '24px 0' }}>
        <h3 style={{ color: '#92400e', fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px' }}>
          💡 Cooking Tips
        </h3>
        <ul style={{ color: '#92400e', fontSize: '14px', margin: '0', paddingLeft: '16px' }}>
          <li>Prep ingredients in advance to make cooking smoother</li>
          <li>Check if you already have pantry staples before shopping</li>
          <li>Cook similar cuisines together to optimize ingredient use</li>
        </ul>
      </div>
    </div>

    {/* Footer */}
    <div style={{ backgroundColor: '#f9fafb', padding: '24px', textAlign: 'center' }}>
      <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px' }}>
        Made with ❤️ by ChefsCart
      </p>
      <p style={{ color: '#9ca3af', fontSize: '12px', margin: '0' }}>
        Questions? Reply to this email or visit our <a href="https://chefscart.ai/#faq" style={{ color: '#10b981', textDecoration: 'none' }}>FAQ page</a>.
      </p>
    </div>
  </div>
)

export const getEmailHtml = (data: MealPlanEmailData): string => {
  // For now, return a simple HTML string. In production, you'd render the React component to HTML
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your ChefsCart Meal Plan</title>
</head>
<body style="margin: 0; padding: 0; font-family: system-ui, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background-color: #10b981; padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">ChefsCart</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 18px;">Your Personalized Meal Plan is Ready!</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 24px;">
            <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 24px;">Hi there! 👋</p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 24px;">
                We've created your personalized meal plan with <strong>${data.meals.length} delicious recipes</strong> and organized all your ingredients into a smart shopping list.
            </p>

            <!-- Instacart CTA -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="${data.cartUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    Shop Your Ingredients on Instacart
                </a>
            </div>

            <!-- Meal Summary -->
            <div style="margin: 32px 0;">
                <h2 style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0 0 16px;">Your Meal Plan</h2>
                <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px;">
                    ${data.meals.map((meal, index) => `
                        <div style="margin-bottom: ${index < data.meals.length - 1 ? '16px' : '0'}; padding-bottom: ${index < data.meals.length - 1 ? '16px' : '0'}; border-bottom: ${index < data.meals.length - 1 ? '1px solid #e5e7eb' : 'none'};">
                            <h3 style="color: #10b981; font-size: 18px; font-weight: bold; margin: 0 0 4px;">${meal.title}</h3>
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">${meal.cuisine} • ${meal.mealType} • ${meal.prepTime}m prep + ${meal.cookTime}m cook • Serves ${meal.servings}${meal.cookingDifficulty ? ` • ${meal.cookingDifficulty}` : ''}</p>
                            <p style="color: #374151; font-size: 14px; margin: 0 0 8px; line-height: 1.5;">${meal.description}</p>
                            <p style="color: #10b981; font-size: 14px; margin: 0; font-weight: 600;">📖 <a href="https://chefscart.ai/recipes/${meal.slug || meal.id}?servings=${meal.servings}" style="color: #10b981; text-decoration: none;">Get cooking instructions →</a></p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Shopping List Preview -->
            <div style="margin: 32px 0;">
                <h2 style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0 0 16px;">Smart Shopping List (${data.consolidatedCart.length} items)</h2>
                <p style="font-size: 14px; color: #6b7280; margin: 0 0 16px;">We've consolidated ingredients across your meals and optimized quantities for ${data.totalServings} total servings.</p>
                <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid #bbf7d0;">
                    ${data.consolidatedCart.slice(0, 10).map((item, index) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${index < Math.min(data.consolidatedCart.length, 10) - 1 ? '8px' : '0'};">
                            <span style="color: #374151; font-size: 14px;">${item.shoppableName || item.name}</span>
                            <span style="color: #6b7280; font-size: 14px; font-weight: 600;">${item.shoppingQuantity} ${item.shoppingUnit}</span>
                        </div>
                    `).join('')}
                    ${data.consolidatedCart.length > 10 ? `
                        <div style="text-align: center; margin-top: 12px;">
                            <span style="color: #10b981; font-size: 14px; font-weight: 600;">+ ${data.consolidatedCart.length - 10} more items</span>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Additional Instacart CTA after shopping list -->
                <div style="text-align: center; margin-top: 20px;">
                    <a href="${data.cartUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                        Shop your ingredients on Instacart
                    </a>
                </div>
            </div>

            <!-- Cooking Equipment Section -->
            <div style="margin: 32px 0;">
                <h2 style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0 0 16px;">Cooking Equipment You May Need</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${extractCookingEquipment(data.meals).map(equipment => `
                        <a href="https://chefscart.ai/shop/category/${equipment.category}" style="display: inline-block; background-color: #f3f4f6; color: #374151; padding: 8px 16px; text-decoration: none; border-radius: 20px; font-size: 14px; font-weight: 500; border: 1px solid #d1d5db; transition: all 0.2s;">
                            ${equipment.name}
                        </a>
                    `).join('')}
                </div>
            </div>

            <!-- Tips -->
            <div style="background-color: #fffbeb; padding: 16px; border-radius: 8px; border: 1px solid #fde68a; margin: 24px 0;">
                <h3 style="color: #92400e; font-size: 16px; font-weight: bold; margin: 0 0 8px;">💡 Cooking Tips</h3>
                <ul style="color: #92400e; font-size: 14px; margin: 0; padding-left: 16px;">
                    <li>Prep ingredients in advance to make cooking smoother</li>
                    <li>Check if you already have pantry staples before shopping</li>
                    <li>Cook similar cuisines together to optimize ingredient use</li>
                </ul>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">Made with ❤️ by ChefsCart</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Questions? Reply to this email or visit our <a href="https://chefscart.ai/#faq" style="color: #10b981; text-decoration: none;">FAQ page</a>.</p>
        </div>
    </div>
</body>
</html>
  `
}