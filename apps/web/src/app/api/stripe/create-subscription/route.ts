import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase'
import { getStripe } from '../../../../../lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { priceId, email, userId } = await req.json()

    if (!priceId || !email || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId, email, userId' },
        { status: 400 }
      )
    }

    // Validate price ID
    const validPriceIds = [
      process.env.STRIPE_ANNUAL_PRICE_ID,
      process.env.STRIPE_MONTHLY_PRICE_ID
    ]

    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const supabase = createClient()

    // Check if user exists and get their profile
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user already has an active subscription
    // @ts-ignore - Property access on user profile result
    if (userProfile.subscription_status === 'active' || userProfile.subscription_status === 'trialing') {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 409 }
      )
    }

    let customer

    // Check if user already has a Stripe customer ID
    // @ts-ignore - Property access on user profile result
    if (userProfile.stripe_customer_id) {
      // @ts-ignore - Property access on user profile result
      customer = await stripe.customers.retrieve(userProfile.stripe_customer_id)
      if (customer.deleted) {
        // Customer was deleted, create a new one
        customer = await stripe.customers.create({
          email,
          metadata: {
            userId,
          },
        })
      }
    } else {
      // Create new Stripe customer
      customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      })
    }

    // Get price details for trial period
    const price = await stripe.prices.retrieve(priceId)
    const trialDays = price.recurring?.trial_period_days || 0

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          userId,
        },
      },
      metadata: {
        userId,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    // Update user profile with customer ID if new
    // @ts-ignore - Property access on user profile result
    if (!userProfile.stripe_customer_id) {
      // @ts-ignore - Type compatibility issue with user profile updates
      const { error: updateError } = await supabase
        .from('user_profiles')
        // @ts-ignore - Type compatibility issue with update data
        .update({
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating user with customer ID:', updateError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      customerId: customer.id,
    })

  } catch (error: any) {
    console.error('Error creating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription', details: error.message },
      { status: 500 }
    )
  }
}