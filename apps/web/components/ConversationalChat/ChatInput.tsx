"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send } from 'lucide-react'
import VoiceInput from '../VoiceInput'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  isLoading?: boolean
}

export default function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message...",
  maxLength = 500,
  isLoading = false
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initialHeight = 44 // min-height in pixels

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to measure scroll height
    textarea.style.height = `${initialHeight}px`
    
    // Calculate new height based on content, max 4 lines
    const maxHeight = initialHeight * 4
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    
    textarea.style.height = `${newHeight}px`
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [message, adjustTextareaHeight])

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    const trimmedMessage = message.trim()
    if (!trimmedMessage || disabled || isLoading) return

    onSendMessage(trimmedMessage)
    setMessage('')
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = `${initialHeight}px`
    }
  }, [message, disabled, isLoading, onSendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxLength) {
      setMessage(value)
    }
  }, [maxLength])

  const handleVoiceTranscription = useCallback((text: string) => {
    setMessage(text)
    // Auto-focus the textarea after voice input
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }, [])

  const handleVoiceError = useCallback((error: string) => {
    console.error('Voice input error:', error)
    // Could show a toast notification or other user feedback here
  }, [])

  const canSend = message.trim().length > 0 && !disabled && !isLoading

  return (
    <div className="border-t border-brand-100 bg-white px-4 py-3">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Voice Input */}
        <div className="relative" title="Try voice input - speak your preferences instead of typing">
          <VoiceInput
            onTranscription={handleVoiceTranscription}
            onError={handleVoiceError}
            disabled={disabled}
            showVisualFeedback={true}
            className="w-7 h-7"
          />
        </div>

        {/* Text Input Container */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={`w-full px-4 py-3 pr-12 border-2 border-brand-200 rounded-2xl resize-none transition-all duration-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-400 ${
              message.length > maxLength * 0.8 ? 'border-warning focus:border-warning' : ''
            }`}
            style={{ 
              minHeight: `${initialHeight}px`,
              maxHeight: `${initialHeight * 4}px`
            }}
            inputMode="text"
            autoCapitalize="sentences"
            aria-label="Type your message"
          />

          {/* Character count */}
          {message.length > maxLength * 0.7 && (
            <div className={`absolute bottom-1 right-14 text-xs transition-colors ${
              message.length > maxLength * 0.9 
                ? 'text-red-500' 
                : message.length > maxLength * 0.8 
                  ? 'text-warning' 
                  : 'text-gray-400'
            }`}>
              {message.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!canSend}
          className={`flex-shrink-0 w-11 h-11 rounded-full transition-all duration-200 focus:ring-4 focus:ring-brand-100 focus:outline-none transform ${
            canSend
              ? 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-green hover:-translate-y-0.5 active:translate-y-0'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          aria-label="Send message"
        >
          {isLoading ? (
            <div className="loading-spinner mx-auto" />
          ) : (
            <Send className="w-5 h-5 mx-auto" />
          )}
        </button>
      </form>

      {/* Hint Text */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        <span>Tell me about your meal preferences - Press Enter to send or click 🎤 to speak</span>
      </div>
    </div>
  )
}