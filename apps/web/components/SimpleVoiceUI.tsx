"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Mic, MicOff, Volume2, Loader2 } from 'lucide-react'
import { getVoiceRecordingService } from '../lib/voice-recording'

interface SimpleVoiceUIProps {
  isVisible: boolean
  onClose: () => void
  onTranscript?: (text: string, response: string) => void
  threadId?: string
  onThreadIdUpdate?: (threadId: string) => void
}

export default function SimpleVoiceUI({
  isVisible,
  onClose,
  onTranscript,
  threadId,
  onThreadIdUpdate
}: SimpleVoiceUIProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  
  const voiceService = useRef(getVoiceRecordingService())
  const audioRef = useRef<HTMLAudioElement>(null)

  const processVoiceInput = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true)
      setError(null)

      // Convert blob to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result?.toString().split(',')[1] || ''
          resolve(base64)
        }
      })
      reader.readAsDataURL(audioBlob)
      const audioBase64 = await base64Promise

      // Send to our simple voice API
      const response = await fetch('/api/voice/realtime-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: audioBase64,
          threadId: threadId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process voice input')
      }

      const data = await response.json()
      
      setTranscript(data.transcription)
      setResponse(data.response)
      
      // Update thread ID if returned
      if (data.threadId && onThreadIdUpdate) {
        onThreadIdUpdate(data.threadId)
      }

      // Notify parent component
      if (onTranscript) {
        onTranscript(data.transcription, data.response)
      }

      // Play audio response
      if (data.audio && audioRef.current) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        )
        const audioUrl = URL.createObjectURL(audioBlob)
        audioRef.current.src = audioUrl
        setIsPlaying(true)
        await audioRef.current.play()
      }

    } catch (error) {
      console.error('Error processing voice:', error)
      setError('Failed to process voice input. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStartRecording = async () => {
    try {
      const service = voiceService.current
      const hasPermission = await service.requestPermission()
      
      if (!hasPermission) {
        setError('Microphone permission denied. Please allow microphone access.')
        return
      }

      const success = await service.startRecording()
      if (success) {
        setIsRecording(true)
        setError(null)
        setTranscript('')
        setResponse('')
      } else {
        setError('Failed to start recording. Please try again.')
      }
    } catch (error) {
      console.error('Error starting recording:', error)
      setError('Failed to start recording. Please check your microphone.')
    }
  }

  const handleStopRecording = async () => {
    try {
      const service = voiceService.current
      const audioBlob = service.stopRecording()
      setIsRecording(false)
      
      if (audioBlob) {
        await processVoiceInput(audioBlob)
      }
    } catch (error) {
      console.error('Error stopping recording:', error)
      setError('Failed to stop recording.')
      setIsRecording(false)
    }
  }

  const handleToggleRecording = () => {
    if (isRecording) {
      handleStopRecording()
    } else {
      handleStartRecording()
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    if (audioRef.current) {
      URL.revokeObjectURL(audioRef.current.src)
    }
  }

  const handleClose = () => {
    if (isRecording) {
      voiceService.current.stopRecording()
    }
    setIsRecording(false)
    setIsProcessing(false)
    setIsPlaying(false)
    setError(null)
    onClose()
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center relative shadow-xl">
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
            Voice Chat with Mila
          </h2>
          <p className="text-sm text-gray-600">
            Tap the microphone to speak your meal preferences
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Voice Button */}
        <div className="mb-8">
          <button
            onClick={handleToggleRecording}
            disabled={isProcessing}
            className={`w-32 h-32 rounded-full transition-all duration-300 flex items-center justify-center ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg'
                : isProcessing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 shadow-md hover:shadow-lg'
            }`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isProcessing ? (
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-12 h-12 text-white" />
            ) : isPlaying ? (
              <Volume2 className="w-12 h-12 text-white" />
            ) : (
              <Mic className="w-12 h-12 text-white" />
            )}
          </button>
        </div>

        {/* Status */}
        <div className="mb-6">
          {isRecording && (
            <p className="text-green-600 font-medium">Listening...</p>
          )}
          {isProcessing && (
            <p className="text-blue-600 font-medium">Processing...</p>
          )}
          {isPlaying && (
            <p className="text-blue-600 font-medium">Mila is speaking...</p>
          )}
          {!isRecording && !isProcessing && !isPlaying && (
            <p className="text-gray-600">Tap to start speaking</p>
          )}
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="mb-4 text-left">
            <p className="text-xs text-gray-500 mb-1">You said:</p>
            <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
              "{transcript}"
            </div>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="text-left">
            <p className="text-xs text-gray-500 mb-1">Mila says:</p>
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
              "{response}"
            </div>
          </div>
        )}

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