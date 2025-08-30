-- Add subscription fields to user_profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(255),
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id ON public.user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_id ON public.user_profiles(subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON public.user_profiles(subscription_status);

-- Add constraint to ensure unique stripe customer IDs
ALTER TABLE public.user_profiles 
ADD CONSTRAINT unique_stripe_customer_id UNIQUE (stripe_customer_id);

-- Add comments for documentation
COMMENT ON COLUMN public.user_profiles.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN public.user_profiles.subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN public.user_profiles.subscription_status IS 'Subscription status: none, trialing, active, past_due, canceled, unpaid';
COMMENT ON COLUMN public.user_profiles.subscription_plan IS 'Stripe price ID for the subscribed plan';
COMMENT ON COLUMN public.user_profiles.trial_end IS 'End date of trial period';
COMMENT ON COLUMN public.user_profiles.current_period_end IS 'End date of current billing period';

-- Update the user profile interface comment
COMMENT ON TABLE public.user_profiles IS 'Extended user profile data with preferences, settings, and subscription info';