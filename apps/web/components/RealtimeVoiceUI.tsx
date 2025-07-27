"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { getRealtimeService, RealtimeVoiceEvent } from '../lib/openai-realtime'

interface RealtimeVoiceUIProps {
  isVisible: boolean
  onClose: () => void
  onTranscript?: (text: string, isUser: boolean) => void
  onConversationEnd?: () => void
  className?: string
}

export default function RealtimeVoiceUI({
  isVisible,
  onClose,
  onTranscript,
  onConversationEnd,
  className = ''
}: RealtimeVoiceUIProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')

  const realtimeService = useRef(getRealtimeService({ voice: 'maple' }))
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const animationFrame = useRef<number>(0)

  // Audio visualization
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!isVisible) return

    const service = realtimeService.current

    const handleConnect = () => {
      console.log('Realtime service connected')
      setIsConnected(true)
      setConnectionStatus('connected')
      setError(null)
    }

    const handleDisconnect = () => {
      console.log('Realtime service disconnected')
      setIsConnected(false)
      setConnectionStatus('disconnected')
      setIsListening(false)
      setIsSpeaking(false)
    }

    const handleError = (error: Error) => {
      console.error('Realtime service error:', error)
      setError(error.message)
      setConnectionStatus('disconnected')
    }

    const handleSpeechStart = () => {
      console.log('Speech started')
      setIsListening(true)
    }

    const handleSpeechEnd = () => {
      console.log('Speech ended')
      setIsListening(false)
    }

    const handleTranscript = (data: { text: string; isUser: boolean }) => {
      console.log('Transcript received:', data)
      setCurrentTranscript(data.text)
      onTranscript?.(data.text, data.isUser)
    }

    const handleTranscriptDelta = (data: { text: string; isUser: boolean }) => {
      if (!data.isUser) {
        setCurrentTranscript(prev => prev + data.text)
      }
    }

    const handleAudioDelta = (data: { audio: string; isUser: boolean }) => {
      if (!data.isUser) {
        setIsSpeaking(true)
        // Play audio delta - would need to implement audio playback
      }
    }

    const handleResponseComplete = () => {
      console.log('Response complete')
      setIsSpeaking(false)
      setCurrentTranscript('')
    }

    // Register event listeners
    service.on('connect', handleConnect)
    service.on('disconnect', handleDisconnect)
    service.on('error', handleError)
    service.on('speech_start', handleSpeechStart)
    service.on('speech_end', handleSpeechEnd)
    service.on('transcript', handleTranscript)
    service.on('transcript_delta', handleTranscriptDelta)
    service.on('audio_delta', handleAudioDelta)
    service.on('response_complete', handleResponseComplete)

    // Connect to the service
    setConnectionStatus('connecting')
    service.connect().catch((error) => {
      console.error('Failed to connect to realtime service:', error)
      setError('Failed to connect to voice service')
      setConnectionStatus('disconnected')
    })

    return () => {
      // Clean up event listeners
      service.off('connect', handleConnect)
      service.off('disconnect', handleDisconnect)
      service.off('error', handleError)
      service.off('speech_start', handleSpeechStart)
      service.off('speech_end', handleSpeechEnd)
      service.off('transcript', handleTranscript)
      service.off('transcript_delta', handleTranscriptDelta)
      service.off('audio_delta', handleAudioDelta)
      service.off('response_complete', handleResponseComplete)
    }
  }, [isVisible, onTranscript])

  // Initialize audio recording
  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      })

      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      })

      const source = audioContext.current.createMediaStreamSource(stream)
      analyser.current = audioContext.current.createAnalyser()
      analyser.current.fftSize = 256
      source.connect(analyser.current)

      // Set up media recorder for realtime streaming
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0 && isConnected) {
          // Convert to the format expected by OpenAI Realtime API
          event.data.arrayBuffer().then((buffer) => {
            realtimeService.current.sendAudio(buffer)
          })
        }
      }

      mediaRecorder.current.start(100) // Send data every 100ms

      startVisualization()

    } catch (error) {
      console.error('Error initializing audio:', error)
      setError('Microphone access denied. Please allow microphone access to use voice mode.')
    }
  }, [isConnected])

  // Audio visualization
  const startVisualization = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser.current) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dataArray = new Uint8Array(analyser.current.frequencyBinCount)

    const draw = () => {
      if (!analyser.current) return

      analyser.current.getByteFrequencyData(dataArray)
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const normalizedVolume = average / 255

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw pulsing circle
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const baseRadius = 60
      const maxRadius = 100
      const radius = baseRadius + (normalizedVolume * (maxRadius - baseRadius))

      // Gradient for the pulsing effect
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      
      if (isListening) {
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)') // Green when listening
        gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.4)')
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)')
      } else if (isSpeaking) {
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)') // Blue when AI is speaking
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.4)')
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)')
      } else {
        gradient.addColorStop(0, 'rgba(156, 163, 175, 0.8)') // Gray when idle
        gradient.addColorStop(0.5, 'rgba(156, 163, 175, 0.4)')
        gradient.addColorStop(1, 'rgba(156, 163, 175, 0.1)')
      }

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.fill()

      // Draw inner circle
      ctx.fillStyle = isListening ? '#22c55e' : isSpeaking ? '#3b82f6' : '#9ca3af'
      ctx.beginPath()
      ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI)
      ctx.fill()

      animationFrame.current = requestAnimationFrame(draw)
    }

    draw()
  }, [isListening, isSpeaking])

  useEffect(() => {
    if (isConnected && isVisible) {
      initializeAudio()
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop()
      }
      if (audioContext.current) {
        audioContext.current.close()
      }
    }
  }, [isConnected, isVisible, initializeAudio])

  const handleClose = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
    }
    if (audioContext.current) {
      audioContext.current.close()
    }
    realtimeService.current.disconnect()
    onClose()
  }

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
            Voice Conversation with Mila
          </h2>
          <p className="text-sm text-gray-600">
            {connectionStatus === 'connecting' && 'Connecting to voice service...'}
            {connectionStatus === 'connected' && 'Connected! Start speaking to Mila.'}
            {connectionStatus === 'disconnected' && 'Disconnected from voice service.'}
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
            {/* Microphone Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {isListening ? (
                <Mic className="w-8 h-8 text-white" />
              ) : isSpeaking ? (
                <Volume2 className="w-8 h-8 text-white" />
              ) : (
                <MicOff className="w-8 h-8 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div className="mb-6">
          {isListening && (
            <p className="text-green-600 font-medium">
              Listening... speak now
            </p>
          )}
          {isSpeaking && (
            <p className="text-blue-600 font-medium">
              Mila is speaking...
            </p>
          )}
          {!isListening && !isSpeaking && isConnected && (
            <p className="text-gray-600">
              Ready to listen
            </p>
          )}
          {!isConnected && (
            <p className="text-red-600">
              Not connected
            </p>
          )}
        </div>

        {/* Current Transcript */}
        {currentTranscript && (
          <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-700 max-h-24 overflow-y-auto">
            "{currentTranscript}"
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500">
          <p>Speak naturally to have a conversation with Mila about your meal planning needs.</p>
          <p className="mt-1">The conversation will continue until you close this window.</p>
        </div>
      </div>
    </div>
  )
}