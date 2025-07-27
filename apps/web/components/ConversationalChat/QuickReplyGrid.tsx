"use client"

import React, { useState, useCallback } from 'react'
import { QuickReply as QuickReplyType } from '../../types'
import QuickReply from './QuickReply'

interface QuickReplyGridProps {
  quickReplies: QuickReplyType[]
  onSelect: (reply: QuickReplyType) => void
  disabled?: boolean
  maxColumns?: number
  selectedValues?: any[]
}

export default function QuickReplyGrid({ 
  quickReplies, 
  onSelect, 
  disabled = false,
  maxColumns = 3,
  selectedValues = []
}: QuickReplyGridProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  if (!quickReplies || quickReplies.length === 0) {
    return null
  }

  // Check if any of the quick replies support multiple selection
  const supportsMultiple = quickReplies.some(reply => reply.allowMultiple)

  const handleSelect = useCallback((reply: QuickReplyType) => {
    if (reply.allowMultiple && supportsMultiple) {
      // Handle multiple selection
      const newSelectedItems = new Set(selectedItems)
      
      if (newSelectedItems.has(reply.id)) {
        newSelectedItems.delete(reply.id)
      } else {
        newSelectedItems.add(reply.id)
      }
      
      setSelectedItems(newSelectedItems)
      
      // Create a reply with combined values for multiple selection
      const selectedReplies = quickReplies.filter(r => newSelectedItems.has(r.id))
      const combinedValues = selectedReplies.map(r => r.value)
      
      // Create a synthetic reply representing the current selection
      const syntheticReply: QuickReplyType = {
        id: 'combined_selection',
        text: selectedReplies.map(r => r.text).join(', '),
        value: combinedValues,
        allowMultiple: true
      }
      
      onSelect(syntheticReply)
    } else {
      // Handle single selection (existing behavior)
      setSelectedItems(new Set([reply.id]))
      onSelect(reply)
    }
  }, [selectedItems, quickReplies, onSelect, supportsMultiple])

  const isSelected = useCallback((reply: QuickReplyType) => {
    if (reply.allowMultiple && supportsMultiple) {
      return selectedItems.has(reply.id)
    }
    // For single selection, check if this is the only selected item
    return selectedItems.has(reply.id) && selectedItems.size === 1
  }, [selectedItems, supportsMultiple])

  return (
    <div className="mt-4 mb-2">
      <div 
        className={`
          grid gap-2 
          ${quickReplies.length === 1 ? 'grid-cols-1' : ''}
          ${quickReplies.length === 2 ? 'grid-cols-2' : ''}  
          ${quickReplies.length >= 3 ? `grid-cols-2 sm:grid-cols-${Math.min(maxColumns, 3)}` : ''}
        `}
      >
        {quickReplies.map((reply) => (
          <QuickReply
            key={reply.id}
            reply={reply}
            onSelect={handleSelect}
            disabled={disabled}
            isSelected={isSelected(reply)}
          />
        ))}
      </div>
      {supportsMultiple && selectedItems.size > 0 && (
        <div className="mt-3">
          <p className="text-xs text-sage-500">
            {selectedItems.size} selected
          </p>
        </div>
      )}
    </div>
  )
}