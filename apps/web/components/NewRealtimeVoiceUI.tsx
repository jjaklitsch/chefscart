"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react'
import { getRealtimeVoiceService, VoiceState, RealtimeVoiceService } from '../lib/realtime-voice-service'

interface NewRealtimeVoiceUIProps {
  isVisible: boolean
  onClose: () => void
  onTranscript?: (text: string, isUser: boolean) => void
  onConversationEnd?: () => void
  className?: string
}

export default function NewRealtimeVoiceUI({
  isVisible,
  onClose,
  onTranscript,
  onConversationEnd,
  className = ''
}: NewRealtimeVoiceUIProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.DISCONNECTED)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [conversationStarted, setConversationStarted] = useState(false)

  const voiceService = useRef<RealtimeVoiceService | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>(0)

  // Initialize voice service
  useEffect(() => {
    if (!isVisible) return

    voiceService.current = getRealtimeVoiceService({
      voice: 'alloy',
      instructions: `You are Carter, a friendly AI sous-chef for ChefsCart. Start by greeting the user and asking how many meals they want to cook this week. Keep all responses very concise (1-2 sentences max). 
      Help users plan meals by asking about their preferences: meal types, dietary restrictions, cooking time, cuisine preferences, and family size. 
      Be enthusiastic about food and respond naturally in conversation.`,
      temperature: 0.9,
      turnDetection: {
        type: 'server_vad',
        threshold: 0.5,
        prefixPaddingMs: 300,
        silenceDurationMs: 500
      }
    })

    const service = voiceService.current

    // Event handlers
    const handleStateChange = ({ to }: { from: VoiceState; to: VoiceState }) => {
      setVoiceState(to)
      
      if (to === VoiceState.CONNECTED && !conversationStarted) {
        setConversationStarted(true)
        // Send greeting
        setTimeout(() => {
          service.generateResponse()
        }, 500)
      }
    }

    const handleError = (error: Error) => {
      console.error('Voice service error:', error)
      setError(error.message)
    }

    const handleAudioLevel = (level: number) => {
      setAudioLevel(level)
    }

    const handleUserTranscript = ({ text }: { text: string; isUser: boolean }) => {
      setCurrentTranscript(text)
      onTranscript?.(text, true)
    }

    const handleTranscriptDelta = ({ text }: { text: string; isUser: boolean }) => {
      setCurrentTranscript(prev => prev + text)
      onTranscript?.(text, false)
    }

    const handleResponseComplete = () => {
      setCurrentTranscript('')
    }

    const handleUserSpeechStart = () => {
      console.log('User started speaking')
    }

    const handleUserSpeechEnd = () => {
      console.log('User stopped speaking')
    }

    const handleAIInterrupted = () => {
      console.log('AI was interrupted by user')
      setCurrentTranscript('')
    }

    // Register event listeners
    service.on('state_change', handleStateChange)
    service.on('error', handleError)
    service.on('audio_level', handleAudioLevel)
    service.on('user_transcript', handleUserTranscript)
    service.on('transcript_delta', handleTranscriptDelta)
    service.on('response_complete', handleResponseComplete)
    service.on('user_speech_start', handleUserSpeechStart)
    service.on('user_speech_end', handleUserSpeechEnd)
    service.on('ai_interrupted', handleAIInterrupted)

    // Connect to service
    service.connect().catch((error) => {
      console.error('Failed to connect to voice service:', error)
      setError('Failed to connect to voice service: ' + error.message)
    })

    return () => {
      // Clean up event listeners
      service.off('state_change', handleStateChange)
      service.off('error', handleError)
      service.off('audio_level', handleAudioLevel)
      service.off('user_transcript', handleUserTranscript)
      service.off('transcript_delta', handleTranscriptDelta)
      service.off('response_complete', handleResponseComplete)
      service.off('user_speech_start', handleUserSpeechStart)
      service.off('user_speech_end', handleUserSpeechEnd)
      service.off('ai_interrupted', handleAIInterrupted)
    }
  }, [isVisible, onTranscript, conversationStarted])

  // Audio visualization
  useEffect(() => {
    if (!isVisible || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      if (!canvas || !ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw pulsing circle based on audio level and state
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const baseRadius = 60
      const maxRadius = 100
      const radius = baseRadius + (audioLevel * (maxRadius - baseRadius) * 10) // Amplify visualization

      // Color based on voice state
      let color = 'rgba(156, 163, 175, 0.8)' // Gray for disconnected
      if (voiceState === VoiceState.LISTENING) {
        color = 'rgba(34, 197, 94, 0.8)' // Green for listening
      } else if (voiceState === VoiceState.AI_SPEAKING) {
        color = 'rgba(59, 130, 246, 0.8)' // Blue for AI speaking
      } else if (voiceState === VoiceState.PROCESSING) {
        color = 'rgba(249, 115, 22, 0.8)' // Orange for processing
      } else if (voiceState === VoiceState.CONNECTING) {
        color = 'rgba(168, 85, 247, 0.8)' // Purple for connecting
      }

      // Draw outer ring
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      gradient.addColorStop(0, color)
      gradient.addColorStop(0.5, color.replace('0.8', '0.4'))
      gradient.addColorStop(1, color.replace('0.8', '0.1'))

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.fill()

      // Draw inner circle
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI)
      ctx.fill()

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isVisible, audioLevel, voiceState])

  const handleClose = useCallback(() => {
    if (voiceService.current) {
      voiceService.current.disconnect()
    }
    setVoiceState(VoiceState.DISCONNECTED)
    setError(null)
    setCurrentTranscript('')
    setConversationStarted(false)
    onClose()
  }, [onClose])

  const getStateDescription = () => {
    switch (voiceState) {
      case VoiceState.CONNECTING:
        return 'Connecting to Carter...'
      case VoiceState.CONNECTED:
        return 'Getting ready...'
      case VoiceState.LISTENING:
        return 'Listening - speak now'
      case VoiceState.AI_SPEAKING:
        return 'Carter is speaking...'
      case VoiceState.PROCESSING:
        return 'Processing your request...'
      case VoiceState.INTERRUPTED:
        return 'Ready to listen'
      default:
        return 'Disconnected'
    }
  }

  const getStateIcon = () => {
    switch (voiceState) {
      case VoiceState.CONNECTING:
        return <Loader2 className="w-8 h-8 text-white animate-spin" />
      case VoiceState.LISTENING:
        return <Mic className="w-8 h-8 text-white" />
      case VoiceState.AI_SPEAKING:
        return <Volume2 className="w-8 h-8 text-white" />
      case VoiceState.PROCESSING:
        return <Loader2 className="w-8 h-8 text-white animate-spin" />
      default:
        return <MicOff className="w-8 h-8 text-white" />
    }
  }

  const isActive = voiceState !== VoiceState.DISCONNECTED

  if (!isVisible) return null

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center ${className}`}>
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close voice mode"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Voice Chat with Carter
          </h2>
          <p className="text-sm text-gray-600">
            {getStateDescription()}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Audio Visualization */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width="200"
              height="200"
              className="rounded-full"
            />
            {/* Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {getStateIcon()}
            </div>
          </div>
        </div>

        {/* Current Transcript */}
        {currentTranscript && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-sm text-gray-700 max-h-32 overflow-y-auto">
            <div className="font-medium text-gray-900 mb-1">Carter:</div>
            "{currentTranscript}"
          </div>
        )}

        {/* Connection Status and Instructions */}
        <div className="text-xs text-gray-500 space-y-2">
          {!isActive && (
            <p className="text-red-600 font-medium">
              Voice mode is not active. Please try reconnecting.
            </p>
          )}
          
          {isActive && (
            <>
              <p>Speak naturally to Carter about your meal planning needs.</p>
              <p>You can interrupt Carter at any time by speaking.</p>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Listening</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>AI Speaking</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Processing</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-50 rounded text-xs text-gray-600">
            <div>State: {voiceState}</div>
            <div>Audio Level: {audioLevel.toFixed(3)}</div>
            <div>Connected: {isActive ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>
    </div>
  )
}