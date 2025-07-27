"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { X, Mic, MicOff, Volume2 } from 'lucide-react'
import { getAudioPlaybackService, AudioPlaybackState } from '../lib/audio-playback'
import { VoiceSynthesisRequest } from '../types'

interface FullScreenVoiceUIProps {
  isVisible: boolean
  onClose: () => void
  onVoiceInput: (text: string) => void
  aiResponseText?: string
  isListening?: boolean
  onStartListening: () => void
  onStopListening: () => void
}

export default function FullScreenVoiceUI({
  isVisible,
  onClose,
  onVoiceInput,
  aiResponseText,
  isListening = false,
  onStartListening,
  onStopListening
}: FullScreenVoiceUIProps) {
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
    isPlaying: false,
    currentItem: null,
    queueLength: 0,
    volume: 0.8
  })
  const [audioLevels, setAudioLevels] = useState<number[]>([0, 0, 0, 0, 0])
  const [isAISpeaking, setIsAISpeaking] = useState(false)

  const [audioService, setAudioService] = useState<any>(null)

  // Initialize audio service on client side only
  useEffect(() => {
    import('../lib/audio-playback').then(({ getAudioPlaybackService }) => {
      try {
        const service = getAudioPlaybackService()
        setAudioService(service)
      } catch (error) {
        console.error('Failed to initialize audio service:', error)
      }
    }).catch(error => {
      console.error('Failed to import audio-playback module:', error)
    })
  }, [])

  // Subscribe to playback state changes
  useEffect(() => {
    if (!audioService) return

    const unsubscribe = audioService.onStateChange((state: AudioPlaybackState) => {
      setPlaybackState(state)
      setIsAISpeaking(state.isPlaying)
    })

    return unsubscribe
  }, [audioService])

  // Auto-play AI responses
  useEffect(() => {
    if (aiResponseText && aiResponseText.trim() && isVisible) {
      handlePlayAIResponse()
    }
  }, [aiResponseText, isVisible])

  // Animate audio levels when listening or AI is speaking
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isListening || isAISpeaking) {
      interval = setInterval(() => {
        setAudioLevels(prev => prev.map(() => Math.random() * 100))
      }, 150)
    } else {
      setAudioLevels([0, 0, 0, 0, 0])
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isListening, isAISpeaking])

  const handlePlayAIResponse = useCallback(async () => {
    if (!aiResponseText?.trim() || !audioService) return

    try {
      await audioService.speak(aiResponseText.trim(), {
        voice: 'nova' as VoiceSynthesisRequest['voice'], // Use a more natural voice for AI
        speed: 1.0,
        priority: 'high',
        interrupt: true, // Interrupt any current audio for AI responses
        onStart: () => {
          setIsAISpeaking(true)
        },
        onEnd: () => {
          setIsAISpeaking(false)
        },
        onError: (error: string) => {
          setIsAISpeaking(false)
          console.error('AI voice synthesis error:', error)
          
          // Show user-friendly error messages
          if (error.includes('not allowed')) {
            // Could show a toast or modal here
            console.warn('Voice playback requires user interaction')
          } else if (error.includes('timeout')) {
            console.warn('Voice synthesis took too long')
          } else if (error.includes('unavailable')) {
            console.warn('Voice synthesis service is currently unavailable')
          }
        }
      })
    } catch (error) {
      setIsAISpeaking(false)
      console.error('AI voice playback error:', error)
    }
  }, [aiResponseText, audioService])

  const handleToggleListening = useCallback(() => {
    if (isListening) {
      onStopListening()
    } else {
      // Stop AI speech when user wants to speak
      if (isAISpeaking && audioService) {
        try {
          audioService.stop()
        } catch (error) {
          console.error('Error stopping audio:', error)
        }
      }
      onStartListening()
    }
  }, [isListening, isAISpeaking, onStartListening, onStopListening, audioService])

  const handleClose = useCallback(() => {
    // Stop any ongoing audio
    if (audioService) {
      try {
        audioService.stop()
      } catch (error) {
        console.error('Error stopping audio on close:', error)
      }
    }
    setIsAISpeaking(false)
    onClose()
  }, [audioService, onClose])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        handleClose()
      }
    }

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden' // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isVisible, handleClose])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white transition-all duration-200 flex items-center justify-center"
        aria-label="Close voice mode"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center space-y-12 text-white max-w-2xl mx-auto px-8">
        {/* Avatar/Animation Area */}
        <div className="relative">
          {/* Outer Ripple Effect */}
          {(isListening || isAISpeaking) && (
            <div className="absolute inset-0 rounded-full border-2 border-white opacity-30 animate-ping scale-150" />
          )}
          
          {/* Inner Circle with Audio Visualization */}
          <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-brand-400 to-fresh-500 shadow-2xl flex items-center justify-center">
            {/* Audio Visualization Bars */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute inset-4 rounded-full bg-black bg-opacity-20 flex items-center justify-center gap-2">
                {audioLevels.map((level, i) => (
                  <div
                    key={i}
                    className="w-2 bg-white rounded-full transition-all duration-150 ease-out"
                    style={{
                      height: `${Math.max(8, (level / 100) * 40)}px`,
                      opacity: isListening || isAISpeaking ? 1 : 0.3
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Central Icon */}
            <div className="relative z-10">
              {isAISpeaking ? (
                <Volume2 className="w-12 h-12 text-white" />
              ) : isListening ? (
                <Mic className="w-12 h-12 text-white animate-pulse" />
              ) : (
                <MicOff className="w-12 h-12 text-white opacity-60" />
              )}
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-light">
            {isAISpeaking 
              ? 'AI is speaking...' 
              : isListening 
                ? 'Listening...' 
                : 'Tap to speak'
            }
          </h2>
          
          <p className="text-lg text-gray-300 max-w-md">
            {isAISpeaking 
              ? 'The AI is responding to your message'
              : isListening 
                ? 'Speak your meal preferences clearly'
                : 'Start a voice conversation about your meal planning needs'
            }
          </p>

          {/* Current AI Response Text (if speaking) */}
          {isAISpeaking && aiResponseText && (
            <div className="mt-6 p-4 bg-white bg-opacity-10 rounded-lg max-w-lg">
              <p className="text-sm text-gray-200 leading-relaxed">
                {aiResponseText}
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-8">
          {/* Main Voice Button */}
          <button
            onClick={handleToggleListening}
            disabled={isAISpeaking}
            className={`w-20 h-20 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : isAISpeaking
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </button>

          {/* Voice Visualization (when listening) */}
          {isListening && (
            <div className="flex items-center space-x-1">
              {audioLevels.slice(0, 3).map((level, i) => (
                <div
                  key={i}
                  className="w-1 bg-white rounded-full transition-all duration-100"
                  style={{
                    height: `${Math.max(4, (level / 100) * 24)}px`
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-gray-400 space-y-2">
          <p>Press and hold the microphone or tap to start speaking</p>
          <p>Press <kbd className="px-2 py-1 bg-white bg-opacity-20 rounded text-xs">ESC</kbd> to exit voice mode</p>
        </div>
      </div>
    </div>
  )
}