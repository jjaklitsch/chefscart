"use client"

import React from 'react'
import { Check } from 'lucide-react'

interface QuickReply {
  id: string
  text: string
  value: string
  selected?: boolean
}

interface QuickRepliesProps {
  replies: QuickReply[]
  onReplySelect: (reply: QuickReply) => void
  multiSelect?: boolean
  disabled?: boolean
  className?: string
}

export default function QuickReplies({ 
  replies, 
  onReplySelect, 
  multiSelect = false,
  disabled = false,
  className = ''
}: QuickRepliesProps) {
  if (!replies || replies.length === 0) {
    return null
  }

  return (
    <div 
      className={`px-4 py-3 bg-gradient-to-r from-brand-50 to-fresh-50 border-t border-brand-100 ${className}`}
      role="region"
      aria-label="Quick reply options"
    >
      <div className="flex flex-wrap gap-2 max-w-full">
        {replies.map((reply) => (
          <button
            key={reply.id}
            onClick={() => !disabled && onReplySelect(reply)}
            disabled={disabled}
            className={`inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-full text-sm font-medium transition-all duration-200 border-2 focus:ring-4 focus:ring-brand-100 focus:outline-none transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
              reply.selected
                ? 'bg-brand-600 text-white border-brand-600 shadow-green'
                : 'bg-white text-brand-700 border-brand-200 hover:border-brand-400 hover:bg-brand-50 hover:shadow-md'
            }`}
            aria-pressed={reply.selected}
            aria-label={`${multiSelect ? 'Toggle' : 'Select'} ${reply.text}`}
          >
            {multiSelect && reply.selected && (
              <Check className="w-4 h-4" aria-hidden="true" />
            )}
            <span className="truncate max-w-[200px]">{reply.text}</span>
          </button>
        ))}
      </div>

      {multiSelect && (
        <div className="mt-2 text-xs text-gray-600 flex items-center">
          <span>Select all that apply</span>
        </div>
      )}
    </div>
  )
}