"use client"

import React from 'react'
import { Bot, User } from 'lucide-react'

interface MessageBubbleProps {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  isLatest?: boolean
}

export default function MessageBubble({ 
  id, 
  role, 
  content, 
  timestamp, 
  isLatest = false 
}: MessageBubbleProps) {
  const isUser = role === 'user'
  
  return (
    <div 
      className={`flex items-start gap-3 mb-6 animate-fade-in ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
      role="listitem"
      aria-label={`${role} message`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser 
          ? 'bg-brand-600 text-white' 
          : 'bg-gradient-to-br from-brand-100 to-fresh-100 text-brand-700 border-2 border-brand-200'
      }`}>
        {isUser ? (
          <User className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Bot className="w-4 h-4" aria-hidden="true" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col max-w-[80%] sm:max-w-[70%] ${
        isUser ? 'items-end' : 'items-start'
      }`}>
        {/* Message Bubble */}
        <div className={`px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 ${
          isUser
            ? 'bg-brand-600 text-white rounded-br-lg hover:shadow-green'
            : 'bg-white border border-brand-100 text-gray-900 rounded-bl-lg hover:shadow-md hover:border-brand-200'
        }`}>
          <p className="text-sm leading-relaxed break-words">
            {content}
          </p>
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className={`text-xs text-gray-500 mt-1 px-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        )}
      </div>
    </div>
  )
}