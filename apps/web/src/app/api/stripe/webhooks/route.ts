import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createClient } from '../../../../../lib/supabase'
import { getStripe } from '../../../../../lib/stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')
  const stripe = getStripe()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const supabase = createClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription)
        break
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Error processing webhook' }, { status: 500 })
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const supabase = createClient()
  
  // Get customer email from Stripe
  const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer
  
  if (customer.deleted) {
    console.error('Customer was deleted')
    return
  }

  // Update user profile with subscription info
  const { error } = await supabase
    .from('user_profiles')
    .update({
      stripe_customer_id: customer.id,
      subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_plan: subscription.items.data[0].price.id,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('email', customer.email)

  if (error) {
    console.error('Error updating subscription in database:', error)
    throw error
  }

  console.log(`Subscription created for customer ${customer.email}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('user_profiles')
    .update({
      subscription_status: subscription.status,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription in database:', error)
    throw error
  }

  console.log(`Subscription updated: ${subscription.id}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('user_profiles')
    .update({
      subscription_status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('subscription_id', subscription.id)

  if (error) {
    console.error('Error updating canceled subscription in database:', error)
    throw error
  }

  console.log(`Subscription canceled: ${subscription.id}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const supabase = createClient()
  
  // Update the current period end date after successful payment
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
  
  const { error } = await supabase
    .from('user_profiles')
    .update({
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('subscription_id', subscription.id)

  if (error) {
    console.error('Error updating payment success in database:', error)
    throw error
  }

  console.log(`Payment succeeded for subscription: ${subscription.id}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Payment failed for subscription: ${invoice.subscription}`)
  // Could send email notification here or update subscription status
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const supabase = createClient()
  
  // Get customer email to send trial ending notification
  const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer
  
  if (customer.deleted) return

  console.log(`Trial ending soon for customer: ${customer.email}`)
  // Could send email notification here about trial ending
}