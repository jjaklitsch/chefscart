"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react'
import { VoiceRecordingState, AudioPermissionState, VoiceTranscriptionResponse } from '../types'

interface VoiceInputProps {
  onTranscription: (text: string) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
  showVisualFeedback?: boolean
}

export default function VoiceInput({
  onTranscription,
  onError,
  disabled = false,
  className = '',
  showVisualFeedback = true
}: VoiceInputProps) {
  const [recordingState, setRecordingState] = useState<VoiceRecordingState>({
    isRecording: false,
    isInitialized: false,
    audioLevel: 0,
    duration: 0
  })
  const [permissionState, setPermissionState] = useState<AudioPermissionState>({
    hasPermission: false,
    isRequesting: false
  })
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  const voiceServiceRef = useRef<any>(null)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxRecordingDuration = 120000 // 2 minutes max

  // Initialize client-side only
  useEffect(() => {
    setIsClient(true)
    
    // Dynamically import and initialize the voice service
    import('../lib/voice-recording').then(({ getVoiceRecordingService }) => {
      voiceServiceRef.current = getVoiceRecordingService()
      
      // Subscribe to service state changes
      if (voiceServiceRef.current) {
        const unsubscribeRecording = voiceServiceRef.current.onStateChange(setRecordingState)
        const unsubscribePermission = voiceServiceRef.current.onPermissionChange(setPermissionState)
        
        // Store unsubscribe functions for cleanup
        return () => {
          unsubscribeRecording()
          unsubscribePermission()
        }
      }
    }).catch(error => {
      console.error('Failed to load voice recording service:', error)
      setTranscriptionError('Voice recording not available')
    })
  }, [])


  // Auto-stop recording after max duration
  useEffect(() => {
    if (recordingState.isRecording) {
      recordingTimeoutRef.current = setTimeout(() => {
        handleStopRecording()
      }, maxRecordingDuration)
    } else {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
        recordingTimeoutRef.current = null
      }
    }

    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
      }
    }
  }, [recordingState.isRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (voiceServiceRef.current) {
        voiceServiceRef.current.cleanup()
      }
    }
  }, [])

  const handleStartRecording = useCallback(async () => {
    if (disabled || isTranscribing || !voiceServiceRef.current) return

    setTranscriptionError(null)
    const voiceService = voiceServiceRef.current

    try {
      const success = await voiceService.startRecording()
      if (!success) {
        const error = voiceService.getState().error || 'Failed to start recording'
        setTranscriptionError(error)
        onError?.(error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Recording failed'
      setTranscriptionError(errorMessage)
      onError?.(errorMessage)
    }
  }, [disabled, isTranscribing, onError])

  const handleStopRecording = useCallback(async () => {
    const voiceService = voiceServiceRef.current
    
    if (!voiceService) return
    
    try {
      const audioBlob = voiceService.stopRecording()
      
      if (!audioBlob) {
        const error = 'No audio data recorded'
        setTranscriptionError(error)
        onError?.(error)
        return
      }

      setIsTranscribing(true)
      setTranscriptionError(null)

      // Send to transcription API
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const transcriptionData: VoiceTranscriptionResponse = await response.json()
      
      if (transcriptionData.text && transcriptionData.text.trim()) {
        onTranscription(transcriptionData.text.trim())
      } else {
        const error = 'No speech detected. Please try speaking more clearly.'
        setTranscriptionError(error)
        onError?.(error)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed'
      setTranscriptionError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsTranscribing(false)
    }
  }, [onTranscription, onError])

  const handleToggleRecording = useCallback(() => {
    if (recordingState.isRecording) {
      handleStopRecording()
    } else {
      handleStartRecording()
    }
  }, [recordingState.isRecording, handleStartRecording, handleStopRecording])

  const requestPermission = useCallback(async () => {
    const voiceService = voiceServiceRef.current
    
    if (!voiceService) return
    
    const hasPermission = await voiceService.requestPermission()
    
    if (!hasPermission) {
      const error = 'Microphone permission is required for voice input'
      setTranscriptionError(error)
      onError?.(error)
    }
  }, [onError])

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Show simple mic icon during SSR or before client initialization
  if (!isClient) {
    return (
      <button
        type="button"
        disabled
        className={`flex-shrink-0 rounded-full border-2 border-brand-200 bg-white text-brand-400 cursor-not-allowed ${className || 'w-11 h-11'}`}
        aria-label="Voice input loading"
      >
        <Mic className={`mx-auto ${className?.includes('w-9') ? 'w-4 h-4' : 'w-5 h-5'}`} />
      </button>
    )
  }

  // Permission not granted
  if (!permissionState.hasPermission && !permissionState.isRequesting) {
    return (
      <button
        type="button"
        onClick={requestPermission}
        disabled={disabled}
        className={`flex-shrink-0 rounded-full border-2 border-brand-200 bg-white text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-all duration-200 focus:ring-4 focus:ring-brand-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className || 'w-11 h-11'}`}
        aria-label="Request microphone permission"
        title="Click to enable voice input"
      >
        <Mic className={`mx-auto ${className?.includes('w-9') ? 'w-4 h-4' : 'w-5 h-5'}`} />
      </button>
    )
  }

  // Permission requesting
  if (permissionState.isRequesting) {
    return (
      <button
        type="button"
        disabled
        className={`flex-shrink-0 rounded-full border-2 border-brand-200 bg-brand-50 text-brand-400 cursor-not-allowed ${className || 'w-11 h-11'}`}
        aria-label="Requesting microphone permission"
      >
        <div className="loading-spinner mx-auto" />
      </button>
    )
  }

  // Main voice input button
  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggleRecording}
        disabled={disabled || isTranscribing}
        className={`flex-shrink-0 rounded-full border-2 transition-all duration-200 focus:ring-4 focus:ring-brand-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
          recordingState.isRecording
            ? 'bg-red-500 border-red-500 text-white hover:bg-red-600 animate-pulse'
            : isTranscribing
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'bg-white border-brand-200 text-brand-600 hover:border-brand-300 hover:bg-brand-50'
        } ${className || 'w-11 h-11'}`}
        aria-label={
          recordingState.isRecording 
            ? 'Stop recording' 
            : isTranscribing
            ? 'Processing...'
            : 'Start voice recording'
        }
        title={
          recordingState.isRecording 
            ? `Recording... ${formatDuration(recordingState.duration)}` 
            : isTranscribing
            ? 'Converting speech to text...'
            : 'Click and hold to record voice message'
        }
      >
        {isTranscribing ? (
          <div className="loading-spinner mx-auto" />
        ) : recordingState.isRecording ? (
          <MicOff className={`mx-auto ${className?.includes('w-9') ? 'w-4 h-4' : 'w-5 h-5'}`} />
        ) : (
          <Mic className={`mx-auto ${className?.includes('w-9') ? 'w-4 h-4' : 'w-5 h-5'}`} />
        )}
      </button>

      {/* Recording Duration Display */}
      {recordingState.isRecording && showVisualFeedback && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {formatDuration(recordingState.duration)}
        </div>
      )}

      {/* Audio Level Indicator */}
      {recordingState.isRecording && showVisualFeedback && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-1 h-3 bg-red-500 rounded-full transition-all duration-100 ${
                recordingState.audioLevel > (i * 20) ? 'opacity-100' : 'opacity-30'
              }`}
              style={{
                height: `${Math.max(3, Math.min(12, 3 + (recordingState.audioLevel / 100) * 9))}px`
              }}
            />
          ))}
        </div>
      )}

      {/* Error Display */}
      {transcriptionError && showVisualFeedback && (
        <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-300 text-red-700 text-xs px-2 py-1 rounded whitespace-nowrap max-w-48 truncate">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          {transcriptionError}
        </div>
      )}

      {/* Processing Indicator */}
      {isTranscribing && showVisualFeedback && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-100 border border-blue-300 text-blue-700 text-xs px-2 py-1 rounded whitespace-nowrap">
          <Volume2 className="w-3 h-3 inline mr-1" />
          Converting speech...
        </div>
      )}
    </div>
  )
}