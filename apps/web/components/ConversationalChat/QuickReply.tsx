"use client"

import React from 'react'
import { QuickReply as QuickReplyType } from '../../types'
import { Check } from 'lucide-react'

interface QuickReplyProps {
  reply: QuickReplyType
  onSelect: (reply: QuickReplyType) => void
  disabled?: boolean
  isSelected?: boolean
}

export default function QuickReply({ reply, onSelect, disabled = false, isSelected = false }: QuickReplyProps) {
  return (
    <button
      onClick={() => onSelect(reply)}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
        transition-all duration-200 border relative overflow-hidden
        ${disabled 
          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          : isSelected
            ? 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700 hover:border-brand-700 shadow-md'
            : 'bg-white text-sage-700 border-sage-300 hover:bg-sage-50 hover:border-sage-400 hover:text-sage-800 hover:shadow-sm active:scale-95'
        }
      `}
      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${reply.text}`}
      aria-pressed={isSelected}
    >
      {reply.icon && <span className="text-base">{reply.icon}</span>}
      <span>{reply.text}</span>
      {isSelected && (
        <Check className="w-4 h-4 ml-1" />
      )}
    </button>
  )
}