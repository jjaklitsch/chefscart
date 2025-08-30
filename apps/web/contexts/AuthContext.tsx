'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createAuthClient } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  updateProfile: (updates: any) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Create a single client instance outside the component to avoid multiple instances
const supabaseClient = createAuthClient()

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session with better error handling
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          // Still set loading to false even if there's an error
          setLoading(false)
          return
        }
        
        if (session) {
          setSession(session)
          setUser(session.user)
          console.log('Initial session found for:', session.user.email)
        } else {
          console.log('No initial session found')
        }
      } catch (error) {
        console.error('Unexpected error getting session:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes with better error handling
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log('Auth state change:', event, session?.user?.email || 'no user')
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Handle auth events
        switch(event) {
          case 'SIGNED_IN':
            console.log('User signed in:', session?.user?.email)
            break
          case 'SIGNED_OUT':
            console.log('User signed out')
            break
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed for:', session?.user?.email)
            break
          case 'USER_UPDATED':
            console.log('User updated:', session?.user?.email)
            break
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabaseClient.auth.signOut()
    if (error) throw error
  }

  const updateProfile = async (updates: any) => {
    const { data, error } = await supabaseClient.auth.updateUser({
      data: updates
    })
    return { data, error }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}