import type { FlowResult, EmailTemplate, MealPlanEmail } from './types';

export async function sendMealPlanEmail(
  emailData: MealPlanEmail,
  resendApiKey?: string
): Promise<FlowResult<string>> {
  try {
    if (!resendApiKey) {
      console.log('Mock email sent:', emailData);
      return {
        success: true,
        data: `mock-email-id-${Date.now()}`
      };
    }
    
    // This would contain the actual Resend integration
    // For now, just log and return success
    console.log('Email would be sent with Resend:', emailData);
    
    return {
      success: true,
      data: `email-id-${Date.now()}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
      retryable: true
    };
  }
}

export function generateMealPlanEmailTemplate(mealPlan: any): EmailTemplate {
  return {
    subject: 'Your ChefsCart Meal Plan is Ready!',
    html: `
      <h1>Your Meal Plan is Ready!</h1>
      <p>We've created a personalized meal plan just for you.</p>
      <p>Total meals: ${mealPlan.meals?.length || 0}</p>
      <p>Estimated cost: $${mealPlan.totalCost?.toFixed(2) || '0.00'}</p>
      <p><a href="${mealPlan.deepLink || '#'}">View your Instacart cart</a></p>
    `,
    text: `Your ChefsCart meal plan is ready! Visit ${mealPlan.deepLink || '#'} to view your cart.`
  };
}