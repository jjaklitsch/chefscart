"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Mic, MicOff, Volume2, Loader2 } from 'lucide-react'
import { getVoiceRecordingService } from '../lib/voice-recording'

interface ContinuousVoiceUIProps {
  isVisible: boolean
  onClose: () => void
  onConversationUpdate?: (userText: string, aiResponse: string) => void
  threadId?: string
  onThreadIdUpdate?: (threadId: string) => void
  preferences?: any
}

export default function ContinuousVoiceUI({
  isVisible,
  onClose,
  onConversationUpdate,
  threadId,
  onThreadIdUpdate,
  preferences = {}
}: ContinuousVoiceUIProps) {
  const [isActive, setIsActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversation, setConversation] = useState<Array<{role: string, content: string}>>([])
  const [audioLevel, setAudioLevel] = useState(0)
  
  const voiceService = useRef(getVoiceRecordingService())
  const audioRef = useRef<HTMLAudioElement>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxRecordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRecordingRef = useRef(false)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)

  // Auto-start when opened
  useEffect(() => {
    if (isVisible && !isActive) {
      // Clear any old conversation when opening
      setConversation([])
      startContinuousListening()
    }
    
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      if (maxRecordingTimeoutRef.current) {
        clearTimeout(maxRecordingTimeoutRef.current)
      }
      stopListening()
    }
  }, [isVisible])

  // Monitor audio levels for voice activity detection
  useEffect(() => {
    if (!isActive) {
      console.log('Voice monitoring not active')
      return
    }

    console.log('Setting up voice monitoring...')
    const unsubscribe = voiceService.current.onStateChange((state) => {
      if (state.audioLevel !== undefined) {
        setAudioLevel(state.audioLevel)
        
        // Voice activity detection - more sensitive thresholds
        console.log('Audio level:', state.audioLevel, 'isProcessing:', isProcessing, 'isPlaying:', isPlaying, 'isRecording:', isRecordingRef.current)
        
        // Better voice detection thresholds to prevent background noise
        const VOICE_START_THRESHOLD = 8.0  // Much higher to avoid background noise
        const VOICE_STOP_THRESHOLD = 4.0   // Higher to prevent false triggers
        const SILENCE_TIMEOUT = 1500       // Longer to prevent cutting off
        
        // Start recording when voice is detected (with enhanced echo prevention)
        if (state.audioLevel > VOICE_START_THRESHOLD && !isProcessing && !isPlaying && !isRecordingRef.current) {
          console.log('🟢 Starting recording - level:', state.audioLevel.toFixed(1))
          startRecording()
          
          // Set maximum recording duration as safety fallback (10 seconds)
          maxRecordingTimeoutRef.current = setTimeout(() => {
            if (isRecordingRef.current) {
              console.log('⏰ Max recording time reached - auto-processing')
              processCurrentRecording()
            }
          }, 10000)
        }
        
        // Handle silence detection when recording
        if (isRecordingRef.current && !isProcessing && !isPlaying) {
          if (state.audioLevel < VOICE_STOP_THRESHOLD) {
            // Audio is quiet - start or continue silence timeout
            if (!silenceTimeoutRef.current) {
              console.log('🟡 Silence detected - starting timeout, level:', state.audioLevel.toFixed(1))
              silenceTimeoutRef.current = setTimeout(() => {
                if (isRecordingRef.current && !isProcessing) {
                  console.log('🔴 Auto-processing after silence')
                  processCurrentRecording()
                }
              }, SILENCE_TIMEOUT)
            }
          } else {
            // Audio detected - cancel any pending timeout
            if (silenceTimeoutRef.current) {
              console.log('🟢 Speech resumed - canceling timeout, level:', state.audioLevel.toFixed(1))
              clearTimeout(silenceTimeoutRef.current)
              silenceTimeoutRef.current = null
            }
          }
        }
      }
    })

    return unsubscribe
  }, [isActive, isProcessing, isPlaying])

  const startContinuousListening = async () => {
    try {
      console.log('Starting continuous listening...')
      const service = voiceService.current
      
      console.log('Requesting microphone permission...')
      const hasPermission = await service.requestPermission()
      
      if (!hasPermission) {
        console.error('Microphone permission denied')
        setError('Microphone permission denied')
        return
      }

      console.log('Initializing voice service...')
      const initialized = await service.initialize()
      if (initialized) {
        console.log('Voice service initialized successfully')
        setIsActive(true)
        setError(null)
        
        // Check if audio monitoring is working
        setTimeout(() => {
          const state = service.getState()
          console.log('Voice service state after initialization:', state)
          console.log('Audio context state:', service.getAudioContext()?.state)
        }, 1000)
        
        // Add initial greeting
        setConversation([{
          role: 'assistant',
          content: "Hi! I'm Carter. Let's chat about your meal preferences. Just start speaking whenever you're ready!"
        }])
        
        // Play greeting
        playResponse("Hi! I'm Carter. Let's chat about your meal preferences. Just start speaking whenever you're ready!")
      } else {
        console.error('Failed to initialize voice service')
        setError('Failed to initialize voice service')
      }
    } catch (error) {
      console.error('Error starting continuous listening:', error)
      setError('Failed to start voice mode: ' + (error as Error).message)
    }
  }

  const startRecording = async () => {
    if (isRecordingRef.current) return
    
    const service = voiceService.current
    const success = await service.startRecording()
    
    if (success) {
      isRecordingRef.current = true
      audioChunksRef.current = []
      recordingStartTimeRef.current = Date.now()
    }
  }

  const processCurrentRecording = async () => {
    if (!isRecordingRef.current || isProcessing) {
      console.log('⚠️ Skipping recording processing - not recording or already processing')
      return
    }
    
    console.log('🎯 Processing current recording...')
    const service = voiceService.current
    const audioBlob = service.stopRecording()
    isRecordingRef.current = false
    
    // Clear all timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
      console.log('🧹 Cleared silence timeout')
    }
    if (maxRecordingTimeoutRef.current) {
      clearTimeout(maxRecordingTimeoutRef.current)
      maxRecordingTimeoutRef.current = null
      console.log('🧹 Cleared max recording timeout')
    }
    
    console.log('Audio blob size:', audioBlob?.size)
    if (!audioBlob || audioBlob.size < 200) {
      console.log('Ignoring recording - too small, size:', audioBlob?.size)
      return // Ignore very short recordings
    }
    
    const recordingDuration = Date.now() - recordingStartTimeRef.current
    console.log('Recording duration:', recordingDuration + 'ms')
    if (recordingDuration < 500) {
      console.log('⚡ Ignoring recording - too short:', recordingDuration + 'ms')
      return // Ignore recordings shorter than 500ms for better quality
    }
    
    setIsProcessing(true)
    
    try {
      // Convert to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result?.toString().split(',')[1] || ''
          resolve(base64)
        }
      })
      reader.readAsDataURL(audioBlob)
      const audioBase64 = await base64Promise

      console.log('Sending audio to API, size:', audioBase64.length)
      
      // Use OpenAI Realtime API for instant processing
      const response = await fetch('/api/voice/realtime-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: audioBase64,
          systemPrompt: `You are Carter, a friendly male AI sous-chef. Keep responses VERY short (1 sentence max). Ask about meal planning preferences: meal types, cooking time, dietary restrictions, cuisines.`,
          conversationHistory: conversation.slice(-4) // Last 2 exchanges for context
        })
      })

      console.log('⚡ Realtime API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('⚡ Realtime API error:', errorText)
        throw new Error(`Realtime API failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('⚡ Realtime response:', data)
      
      // Update conversation  
      if (data.transcription) {
        console.log(`⚡ API processed in ${data.processingTime || 0}ms`)
        
        setConversation(prev => [
          ...prev,
          { role: 'user', content: data.transcription },
          { role: 'assistant', content: data.response }
        ])
        
        // Notify parent
        if (onConversationUpdate) {
          onConversationUpdate(data.transcription, data.response)
        }
        
        // Play response immediately when ready
        if (data.audio) {
          await playAudioResponse(data.audio)
        } else {
          await playResponse(data.response)
        }
      }
      
    } catch (error) {
      console.error('Error processing voice:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Provide more specific error messages
      if (errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.')
      } else if (errorMessage.includes('400')) {
        setError('Audio processing issue. Please speak clearly and try again.')
      } else if (errorMessage.includes('500')) {
        setError('Server error. Please try again in a moment.')
      } else {
        setError('Failed to process. Please try again.')
      }
      
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  const playResponse = async (text: string) => {
    try {
      setIsPlaying(true)
      
      // Use TTS API
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: 'alloy',
          speed: 1.1,
          format: 'base64'
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.audio && audioRef.current) {
          const audioBlob = new Blob(
            [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
            { type: 'audio/mpeg' }
          )
          const audioUrl = URL.createObjectURL(audioBlob)
          audioRef.current.src = audioUrl
          await audioRef.current.play()
        }
      }
    } catch (error) {
      console.error('Error playing response:', error)
    } finally {
      setIsPlaying(false)
    }
  }

  const playAudioResponse = async (audioBase64: string) => {
    try {
      setIsPlaying(true)
      
      if (audioRef.current) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        )
        const audioUrl = URL.createObjectURL(audioBlob)
        audioRef.current.src = audioUrl
        await audioRef.current.play()
      }
    } catch (error) {
      console.error('Error playing audio:', error)
    } finally {
      setIsPlaying(false)
    }
  }

  const stopListening = () => {
    const service = voiceService.current
    if (isRecordingRef.current) {
      service.stopRecording()
      isRecordingRef.current = false
    }
    service.cleanup()
    setIsActive(false)
  }

  const handleClose = () => {
    stopListening()
    setIsActive(false)
    setError(null)
    onClose()
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    if (audioRef.current) {
      URL.revokeObjectURL(audioRef.current.src)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full relative shadow-xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close voice mode"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Chatting with Carter
          </h2>
          <p className="text-sm text-gray-600">
            Just speak naturally - I'm listening!
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Visual Feedback */}
        <div className="mb-6 flex justify-center">
          <div className={`relative w-32 h-32 rounded-full ${
            isActive 
              ? isPlaying 
                ? 'bg-blue-500' 
                : isProcessing
                  ? 'bg-yellow-500'
                  : audioLevel > 2.5
                    ? 'bg-green-500'
                    : audioLevel > 1.5
                      ? 'bg-yellow-400'
                      : 'bg-gray-300'
              : 'bg-gray-400'
          } transition-all duration-300 flex items-center justify-center`}>
            {/* Ripple effect when active */}
            {isActive && !isProcessing && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-current" />
            )}
            
            {/* Center icon */}
            <div className="relative z-10">
              {isProcessing ? (
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              ) : isPlaying ? (
                <Volume2 className="w-12 h-12 text-white" />
              ) : isActive ? (
                <Mic className="w-12 h-12 text-white" />
              ) : (
                <MicOff className="w-12 h-12 text-white" />
              )}
            </div>

            {/* Audio level indicator */}
            {isActive && !isProcessing && !isPlaying && (
              <div 
                className="absolute inset-0 rounded-full border-4 border-white opacity-50"
                style={{
                  transform: `scale(${1 + (audioLevel / 100) * 0.3})`,
                  transition: 'transform 100ms ease-out'
                }}
              />
            )}
          </div>
        </div>

        {/* Status */}
        <div className="text-center mb-4">
          <p className={`font-medium ${
            isPlaying ? 'text-blue-600' : 
            isProcessing ? 'text-yellow-600' :
            audioLevel > 2.5 ? 'text-green-600' :
            audioLevel > 1.5 ? 'text-yellow-600' :
            'text-gray-600'
          }`}>
            {isPlaying ? "Carter is speaking..." :
             isProcessing ? "Processing..." :
             audioLevel > 2.5 ? "Listening..." :
             audioLevel > 1.5 ? "Detecting voice..." :
             isActive ? "Ready to listen" :
             "Initializing..."}
          </p>
        </div>

        {/* Recent conversation */}
        <div className="max-h-32 overflow-y-auto border-t pt-4">
          {conversation.slice(-2).map((msg, idx) => (
            <div key={idx} className="mb-2">
              <p className="text-xs text-gray-500 font-medium">
                {msg.role === 'user' ? 'You:' : 'Carter:'}
              </p>
              <p className="text-sm text-gray-700">
                {msg.content}
              </p>
            </div>
          ))}
        </div>

        {/* Manual Controls */}
        <div className="text-center mb-4 space-y-2">
          {/* Auto-processing status display */}
          {isRecordingRef.current && (
            <div className="space-y-2">
              <div className="text-xs text-red-500 font-medium">
                🔴 Recording... (auto-processing after 1s silence)
              </div>
              <button
                onClick={() => {
                  console.log('🛑 Manual stop triggered')
                  processCurrentRecording()
                }}
                className="text-xs text-gray-500 hover:text-red-500 underline"
              >
                Stop now
              </button>
            </div>
          )}
          
          {/* Test API Button */}
          <button
            onClick={async () => {
              console.log('🧪 Manual voice test triggered')
              setIsProcessing(true)
              try {
                const response = await fetch('/api/voice/continuous-chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    audio: '', // Empty audio for test
                    threadId: threadId,
                    preferences: preferences,
                    conversationHistory: []
                  })
                })
                console.log('Test response:', response.status)
                if (response.ok) {
                  const data = await response.json()
                  console.log('Test data:', data)
                }
              } catch (error) {
                console.error('Test error:', error)
              }
              setIsProcessing(false)
            }}
            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Test API
          </button>
        </div>

        {/* Instructions */}
        <div className="text-center text-xs text-gray-500 mt-4">
          <p>Speak naturally when you're ready. I'll respond automatically.</p>
          <p className="mt-1">Audio Level: {audioLevel.toFixed(1)} | Recording: {isRecordingRef.current ? 'Yes' : 'No'}</p>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      </div>
    </div>
  )
}