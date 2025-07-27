"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { Volume2, VolumeX, Pause, Play } from 'lucide-react'
import { getAudioPlaybackService, AudioPlaybackState } from '../lib/audio-playback'
import { VoiceSynthesisRequest } from '../types'

interface VoiceResponseProps {
  text: string
  voice?: VoiceSynthesisRequest['voice']
  speed?: number
  autoPlay?: boolean
  showControls?: boolean
  className?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

export default function VoiceResponse({
  text,
  voice = 'alloy',
  speed = 1.0,
  autoPlay = false,
  showControls = true,
  className = '',
  onStart,
  onEnd,
  onError
}: VoiceResponseProps) {
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
    isPlaying: false,
    currentItem: null,
    queueLength: 0,
    volume: 0.8
  })
  const [hasPlayed, setHasPlayed] = useState(false)
  const [isThisItemPlaying, setIsThisItemPlaying] = useState(false)

  const audioService = getAudioPlaybackService()

  // Subscribe to playback state changes
  useEffect(() => {
    const unsubscribe = audioService.onStateChange((state) => {
      setPlaybackState(state)
      
      // Check if the current playing item matches our text
      const isOurText = state.currentItem?.text === text.trim()
      setIsThisItemPlaying(state.isPlaying && isOurText)
    })

    return unsubscribe
  }, [text, audioService])

  // Auto-play if requested
  useEffect(() => {
    if (autoPlay && !hasPlayed && text.trim()) {
      handlePlay()
      setHasPlayed(true)
    }
  }, [autoPlay, hasPlayed, text])

  const handlePlay = useCallback(async () => {
    if (!text.trim()) return

    try {
      await audioService.speak(text.trim(), {
        voice,
        speed,
        priority: 'normal',
        interrupt: false, // Don't interrupt other audio
        onStart: () => {
          setIsThisItemPlaying(true)
          onStart?.()
        },
        onEnd: () => {
          setIsThisItemPlaying(false)
          onEnd?.()
        },
        onError: (error) => {
          setIsThisItemPlaying(false)
          onError?.(error)
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Playback failed'
      onError?.(errorMessage)
    }
  }, [text, voice, speed, audioService, onStart, onEnd, onError])

  const handleStop = useCallback(() => {
    // Only stop if this specific item is playing
    if (isThisItemPlaying) {
      audioService.stop()
    }
  }, [isThisItemPlaying, audioService])

  const handlePause = useCallback(() => {
    if (isThisItemPlaying) {
      audioService.pause()
    }
  }, [isThisItemPlaying, audioService])

  const handleResume = useCallback(() => {
    audioService.resume()
  }, [audioService])

  // Don't render if no text
  if (!text.trim() || !showControls) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Play/Pause/Stop Button */}
      <button
        onClick={isThisItemPlaying ? handlePause : playbackState.isPlaying ? handleStop : handlePlay}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 hover:bg-brand-200 text-brand-600 hover:text-brand-700 transition-all duration-200 focus:ring-2 focus:ring-brand-300 focus:outline-none"
        aria-label={
          isThisItemPlaying 
            ? 'Pause voice' 
            : playbackState.isPlaying 
            ? 'Stop current voice and play this' 
            : 'Play voice'
        }
        title={
          isThisItemPlaying 
            ? 'Pause this message' 
            : playbackState.isPlaying 
            ? 'Stop current playback and play this message' 
            : 'Listen to this message'
        }
      >
        {isThisItemPlaying ? (
          playbackState.isPlaying ? (
            <Pause className="w-4 h-4 mx-auto" />
          ) : (
            <Play className="w-4 h-4 mx-auto" />
          )
        ) : playbackState.isPlaying ? (
          <VolumeX className="w-4 h-4 mx-auto" />
        ) : (
          <Volume2 className="w-4 h-4 mx-auto" />
        )}
      </button>

      {/* Visual Indicator */}
      {isThisItemPlaying && (
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-3 bg-brand-500 rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
          <span className="text-xs text-brand-600 font-medium">Playing</span>
        </div>
      )}

      {/* Queue Indicator */}
      {playbackState.queueLength > 0 && !isThisItemPlaying && (
        <span className="text-xs text-gray-500">
          {playbackState.queueLength} in queue
        </span>
      )}

      {/* Error Display */}
      {playbackState.error && (
        <span className="text-xs text-red-500 truncate max-w-32" title={playbackState.error}>
          {playbackState.error}
        </span>
      )}
    </div>
  )
}