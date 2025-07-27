"use client"

import React, { useEffect } from 'react'
import { ChefHat, Mic, MessageSquare, ArrowLeft, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WelcomeScreenProps {
  onChooseVoice: () => void
  onChooseChat: () => void
  onChooseGuided: () => void
}

export default function WelcomeScreen({ onChooseVoice, onChooseChat, onChooseGuided }: WelcomeScreenProps) {
  const router = useRouter()

  useEffect(() => {
    console.log('WelcomeScreen mounted')
    console.log('onChooseChat prop:', onChooseChat)
    console.log('onChooseVoice prop:', onChooseVoice)
    
    return () => {
      console.log('WelcomeScreen unmounting')
    }
  }, [onChooseChat, onChooseVoice])

  const handleVoiceClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Voice button clicked')
    onChooseVoice()
  }


  const handleBackClick = () => {
    console.log('Back button clicked')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-health-gradient flex items-center justify-center p-4">
      <div className="text-center max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-600 to-brand-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-brand">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-neutral-800 mb-4">
            Meet Carter, Your AI Sous-Chef
          </h1>
          <p className="text-lg text-neutral-600 leading-relaxed">
            I'm here to help you create personalized meal plans that fit your tastes, schedule, and dietary needs. 
            How would you like to get started?
          </p>
        </div>

        {/* Choice Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Guided Onboarding Card - Primary Option */}
          <button
            onClick={onChooseGuided}
            className="bg-white rounded-2xl p-8 shadow-soft hover:shadow-soft-lg transition-all duration-300 transform hover:scale-[1.02] text-left group cursor-pointer relative border-2 border-brand-200"
          >
            {/* Recommended Badge */}
            <div className="absolute -top-3 left-4 bg-brand-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
              Recommended
            </div>
            
            <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-full w-16 h-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-display font-semibold text-neutral-800 mb-2">
              Quick Setup
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Answer 6 quick questions to get your personalized meal plan in under 2 minutes.
            </p>
            <div className="mt-4 text-brand-600 font-medium text-sm">
              Fastest way to get started →
            </div>
          </button>

          {/* Voice Mode Card */}
          <button
            onClick={handleVoiceClick}
            className="bg-white rounded-2xl p-8 shadow-soft hover:shadow-soft-lg transition-all duration-300 transform hover:scale-[1.02] text-left group cursor-pointer pointer-events-auto"
            style={{ zIndex: 10 }}
          >
            <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-full w-16 h-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-display font-semibold text-neutral-800 mb-2">
              Speak with Carter
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Have a natural voice conversation about your meal preferences. Just speak and I'll understand.
            </p>
            <div className="mt-4 text-brand-600 font-medium text-sm">
              Recommended for quick planning →
            </div>
          </button>

          {/* Chat Mode Card */}
          <button
            type="button"
            onClick={(e) => {
              console.log('Main Chat Card clicked')
              e.preventDefault()
              e.stopPropagation()
              onChooseChat()
            }}
            className="bg-white rounded-2xl p-8 shadow-soft hover:shadow-soft-lg transition-all duration-300 transform hover:scale-[1.02] text-left group cursor-pointer w-full"
          >
            <div className="bg-gradient-to-br from-sage-500 to-sage-600 rounded-full w-16 h-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-display font-semibold text-neutral-800 mb-2">
              Chat with Carter
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Type your preferences and I'll guide you through creating your perfect meal plan step by step.
            </p>
            <div className="mt-4 text-sage-600 font-medium text-sm">
              Great for detailed preferences →
            </div>
          </button>
        </div>



        {/* Back Button */}
        <button
          onClick={handleBackClick}
          className="text-neutral-600 hover:text-brand-600 font-medium transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to homepage
        </button>
      </div>
    </div>
  )
}