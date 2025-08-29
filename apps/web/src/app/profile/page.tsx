'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { ArrowLeft, User, Mail, MapPin, Settings, Save, Edit3 } from 'lucide-react'
import Link from 'next/link'
import { createAuthClient } from '../../../lib/supabase'
import { UserPreferences } from '../../../types'

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [isEditing, setIsEditing] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (user) {
      loadUserProfile()
    }
  }, [user, loading, router])

  const loadUserProfile = async () => {
    try {
      const supabase = createAuthClient()
      
      // Load user profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (profileError) {
        // Fallback to user metadata
        if (user?.user_metadata) {
          setProfile({
            email: user.email,
            zip_code: user.user_metadata.zipCode,
            preferences: user.user_metadata.preferences,
            completed_onboarding: user.user_metadata.completedOnboarding
          })
          setPreferences(user.user_metadata.preferences)
        }
      } else {
        setProfile(profileData)
        setPreferences(profileData.preferences)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setError('Failed to load profile data')
    } finally {
      setLoadingProfile(false)
    }
  }

  const saveProfile = async () => {
    if (!user || !profile) return

    setIsSaving(true)
    setError(null)

    try {
      const supabase = createAuthClient()
      
      // Update database
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: profile.email,
          zip_code: profile.zip_code,
          preferences: preferences,
          completed_onboarding: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (updateError) {
        throw updateError
      }

      // Also update auth user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          zipCode: profile.zip_code,
          preferences: preferences,
          completedOnboarding: true
        }
      })

      if (metadataError) {
        console.warn('Error updating user metadata:', metadataError)
        // Don't fail the save if metadata update fails
      }

      setIsEditing(false)
    } catch (error) {
      console.error('Error saving profile:', error)
      setError('Failed to save profile changes')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-health-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading profile...</h2>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-health-gradient">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            
            {!isEditing ? (
              <span></span>
            ) : (
              <button
                onClick={saveProfile}
                disabled={isSaving}
                className="inline-flex items-center gap-2 bg-brand-green hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-brand-green rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
              <p className="text-gray-600">Manage your account settings and preferences</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email Address
              </label>
              <input
                type="email"
                value={profile?.email || user?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Contact support@chefscart.ai to change your email</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                ZIP Code
              </label>
              <input
                type="text"
                value={profile?.zip_code || ''}
                onChange={(e) => {
                  const newProfile = { ...profile, zip_code: e.target.value }
                  setProfile(newProfile)
                  // Auto-save on change
                  setTimeout(() => {
                    if (newProfile.zip_code?.length === 5) {
                      saveProfile()
                    }
                  }, 500)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors"
                placeholder="Enter ZIP code"
              />
            </div>
          </div>
        </div>

        {/* Preferences Summary */}
        {preferences && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Meal Preferences
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Dietary Style</h3>
                <p className="text-gray-600 text-sm">
                  {preferences.dietaryStyle?.join(', ') || 'No restrictions'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Favorite Cuisines</h3>
                <p className="text-gray-600 text-sm">
                  {preferences.cuisinePreferences?.join(', ') || 'All cuisines'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Spice Tolerance</h3>
                <p className="text-gray-600 text-sm">
                  {preferences.spiceTolerance === '1' ? '1 - Mild' : 
                   preferences.spiceTolerance === '2' ? '2 - Low' :
                   preferences.spiceTolerance === '3' ? '3 - Medium' : 
                   preferences.spiceTolerance === '4' ? '4 - Hot' :
                   preferences.spiceTolerance === '5' ? '5 - Very Spicy' : 'Not specified'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Max Cook Time</h3>
                <p className="text-gray-600 text-sm">
                  {preferences.maxCookingTime || 30} minutes
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">People per Meal</h3>
                <p className="text-gray-600 text-sm">
                  {preferences.peoplePerMeal || 2} people
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Foods to Avoid</h3>
                <p className="text-gray-600 text-sm">
                  {preferences.foodsToAvoid && preferences.foodsToAvoid.length > 0 
                    ? preferences.foodsToAvoid.join(', ') 
                    : 'None selected'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Organic Preference</h3>
                <p className="text-gray-600 text-sm">
                  {preferences.organicPreference === 'yes' ? 'Yes, prefer organic when available' :
                   preferences.organicPreference === 'no' ? 'No, go with the lowest cost option' :
                   'No preference'}
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/preferences"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <Settings className="w-5 h-5" />
                Update Preferences
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}