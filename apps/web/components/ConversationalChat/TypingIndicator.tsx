"use client"

import React from 'react'
import { Bot } from 'lucide-react'

interface TypingIndicatorProps {
  message?: string
  className?: string
}

export default function TypingIndicator({ 
  message = "AI is typing...",
  className = ''
}: TypingIndicatorProps) {
  return (
    <div 
      className={`flex items-start gap-3 mb-6 animate-fade-in ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* AI Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-100 to-fresh-100 text-brand-700 border-2 border-brand-200 flex items-center justify-center">
        <Bot className="w-4 h-4" aria-hidden="true" />
      </div>

      {/* Typing Bubble */}
      <div className="bg-white border border-brand-100 rounded-2xl rounded-bl-lg px-4 py-3 shadow-sm max-w-[70%]">
        <div className="flex items-center gap-1">
          {/* Typing Animation Dots */}
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
            />
            <div 
              className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"
              style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
            />
            <div 
              className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"
              style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
            />
          </div>
          
          {/* Optional typing message */}
          <span className="text-xs text-gray-500 ml-2 sr-only">
            {message}
          </span>
        </div>
      </div>
    </div>
  )
}