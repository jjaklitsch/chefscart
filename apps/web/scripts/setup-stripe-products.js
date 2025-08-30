const Stripe = require('stripe');
require('dotenv').config({ path: '../../.env.local' });

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setupStripeProducts() {
  try {
    console.log('🚀 Setting up Stripe products and prices for ChefsCart...');
    
    // Create the product
    const product = await stripe.products.create({
      name: 'ChefsCart Premium',
      description: 'Personalized meal planning with smart grocery shopping',
      type: 'service',
      metadata: {
        app: 'chefscart',
        version: '1.0'
      }
    });

    console.log('✅ Product created:', product.id);

    // Create Annual Price ($4.99/month, billed yearly at $59.88)
    const annualPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 5988, // $59.88 in cents
      currency: 'usd',
      recurring: {
        interval: 'year',
        trial_period_days: 14
      },
      nickname: 'Annual Plan',
      metadata: {
        plan_type: 'annual',
        monthly_equivalent: '4.99',
        trial_days: '14'
      }
    });

    console.log('✅ Annual price created:', annualPrice.id);

    // Create Monthly Price ($5.99/month)
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 599, // $5.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        trial_period_days: 7
      },
      nickname: 'Monthly Plan',
      metadata: {
        plan_type: 'monthly',
        trial_days: '7'
      }
    });

    console.log('✅ Monthly price created:', monthlyPrice.id);

    // Output the price IDs for .env.local
    console.log('\n🎯 Add these to your .env.local file:');
    console.log(`STRIPE_PRODUCT_ID=${product.id}`);
    console.log(`STRIPE_ANNUAL_PRICE_ID=${annualPrice.id}`);
    console.log(`STRIPE_MONTHLY_PRICE_ID=${monthlyPrice.id}`);
    
    console.log('\n📋 Summary:');
    console.log(`Product: ${product.name} (${product.id})`);
    console.log(`Annual: $59.88/year with 14-day trial (${annualPrice.id})`);
    console.log(`Monthly: $5.99/month with 7-day trial (${monthlyPrice.id})`);
    
  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error);
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  setupStripeProducts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setupStripeProducts };