'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createClient } from '../lib/supabase'
import type { UserProfile } from '../lib/supabase'

export interface SubscriptionStatus {
  isActive: boolean
  isTrialing: boolean
  isPastDue: boolean
  isCanceled: boolean
  trialEndsAt: Date | null
  currentPeriodEndsAt: Date | null
  planType: 'annual' | 'monthly' | null
  loading: boolean
}

export function useSubscription() {
  const { user } = useAuth()
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isActive: false,
    isTrialing: false,
    isPastDue: false,
    isCanceled: false,
    trialEndsAt: null,
    currentPeriodEndsAt: null,
    planType: null,
    loading: true,
  })

  useEffect(() => {
    if (!user) {
      setSubscriptionStatus(prev => ({ ...prev, loading: false }))
      return
    }

    const fetchSubscriptionStatus = async () => {
      try {
        const supabase = createClient()
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('subscription_status, subscription_plan, trial_end, current_period_end')
          .eq('id', user.id)
          .single() as { data: any, error: any }

        if (error || !profile) {
          console.error('Error fetching subscription status:', error)
          return
        }

        const isActive = profile.subscription_status === 'active'
        const isTrialing = profile.subscription_status === 'trialing'
        const isPastDue = profile.subscription_status === 'past_due'
        const isCanceled = profile.subscription_status === 'canceled'
        
        const trialEndsAt = profile.trial_end ? new Date(profile.trial_end) : null
        const currentPeriodEndsAt = profile.current_period_end ? new Date(profile.current_period_end) : null
        
        // Determine plan type from price ID
        let planType: 'annual' | 'monthly' | null = null
        if (profile.subscription_plan === process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID) {
          planType = 'annual'
        } else if (profile.subscription_plan === process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID) {
          planType = 'monthly'
        }

        setSubscriptionStatus({
          isActive,
          isTrialing,
          isPastDue,
          isCanceled,
          trialEndsAt,
          currentPeriodEndsAt,
          planType,
          loading: false,
        })
      } catch (error) {
        console.error('Error fetching subscription:', error)
        setSubscriptionStatus(prev => ({ ...prev, loading: false }))
      }
    }

    fetchSubscriptionStatus()
  }, [user])

  const hasActiveSubscription = subscriptionStatus.isActive || subscriptionStatus.isTrialing
  const needsUpgrade = !hasActiveSubscription && !subscriptionStatus.loading

  return {
    ...subscriptionStatus,
    hasActiveSubscription,
    needsUpgrade,
  }
}