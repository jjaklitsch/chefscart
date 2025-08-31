'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../../../../contexts/AuthContext'
import { ArrowLeft, Save, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { createAuthClient } from '../../../../../lib/supabase'
import { SocialUserProfile } from '../../../../../types'
import Header from '../../../../../components/Header'

export default function EditProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const userId = params.user_id as string

  const [profile, setProfile] = useState<SocialUserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    bio: '',
    location: '',
    website_url: '',
    is_public: true
  })

  useEffect(() => {
    if (!authLoading && (!user || user.id !== userId)) {
      router.push('/login')
    } else if (user && user.id === userId) {
      loadUserProfile()
    }
  }, [user, authLoading, userId, router])

  const loadUserProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const supabase = createAuthClient()
      
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        setError('Failed to load profile')
        console.error('Error loading profile:', profileError)
        return
      }

      setProfile(profileData)
      setFormData({
        username: profileData.username || '',
        display_name: profileData.display_name || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
        website_url: profileData.website_url || '',
        is_public: profileData.is_public !== false
      })
    } catch (error) {
      console.error('Error loading user profile:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear any success message when user starts editing
    if (successMessage) {
      setSuccessMessage(null)
    }
  }

  const validateForm = (): string | null => {
    if (!formData.username.trim()) {
      return 'Username is required'
    }
    if (formData.username.length < 3) {
      return 'Username must be at least 3 characters long'
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      return 'Username can only contain letters, numbers, and underscores'
    }
    if (!formData.display_name.trim()) {
      return 'Display name is required'
    }
    if (formData.display_name.length > 50) {
      return 'Display name cannot exceed 50 characters'
    }
    if (formData.bio.length > 500) {
      return 'Bio cannot exceed 500 characters'
    }
    if (formData.website_url && !formData.website_url.match(/^https?:\/\/.+/)) {
      return 'Website URL must start with http:// or https://'
    }
    return null
  }

  const handleSave = async () => {
    if (!user || !profile) return

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const supabase = createAuthClient()

      // Check if username is already taken (excluding current user)
      if (formData.username !== profile.username) {
        const { data: existingUser } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('username', formData.username)
          .neq('id', userId)
          .single()

        if (existingUser) {
          setError('Username is already taken')
          setIsSaving(false)
          return
        }
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          username: formData.username.toLowerCase(),
          display_name: formData.display_name.trim(),
          bio: formData.bio.trim() || null,
          location: formData.location.trim() || null,
          website_url: formData.website_url.trim() || null,
          is_public: formData.is_public,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      setSuccessMessage('Profile updated successfully!')
      
      // Update local profile state
      setProfile({
        ...profile,
        username: formData.username.toLowerCase(),
        display_name: formData.display_name.trim(),
        bio: formData.bio.trim() || '',
        location: formData.location.trim() || '',
        website_url: formData.website_url.trim() || '',
        is_public: formData.is_public
      })

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)

    } catch (error) {
      console.error('Error saving profile:', error)
      setError('Failed to save profile changes')
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-health-gradient">
        <Header />
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4 w-12 h-12"></div>
            <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-health-gradient">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href={`/user/${userId}`}
              className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-soft border border-neutral-200 p-6">
          <div className="space-y-6">
            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Profile Picture
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <Upload className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                  >
                    Upload Image
                  </button>
                  {profile.avatar_url && (
                    <button
                      disabled
                      className="px-4 py-2 text-gray-400 hover:text-gray-600 transition-colors cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Image upload coming soon</p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                placeholder="yourusername"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your unique username. Can only contain letters, numbers, and underscores.
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                placeholder="Your Display Name"
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                How your name appears to other users. {50 - formData.display_name.length} characters remaining.
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors resize-none"
                placeholder="Tell others a bit about yourself and your cooking journey..."
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. {500 - formData.bio.length} characters remaining.
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                placeholder="New York, NY"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. Share your location with other food enthusiasts.
              </p>
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                placeholder="https://yourblog.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. Link to your blog, Instagram, or other website.
              </p>
            </div>

            {/* Privacy */}
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => handleInputChange('is_public', e.target.checked)}
                  className="w-5 h-5 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Public Profile</span>
                  <p className="text-xs text-gray-500 mt-1">
                    Allow others to find and view your profile, recipes, and collections.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200 mt-8">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}