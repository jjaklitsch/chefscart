import { NextRequest, NextResponse } from 'next/server'
import { assistantService } from '../../../../lib/openai-assistant'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, threadId } = body

    switch (action) {
      case 'create':
        const newThreadId = await assistantService.createThread()
        return NextResponse.json({
          success: true,
          threadId: newThreadId,
          message: 'Thread created successfully'
        })

      case 'delete':
        if (!threadId) {
          return NextResponse.json({
            success: false,
            error: 'Thread ID is required for delete action'
          }, { status: 400 })
        }

        await assistantService.deleteThread(threadId)
        return NextResponse.json({
          success: true,
          message: 'Thread deleted successfully'
        })

      case 'get_messages':
        if (!threadId) {
          return NextResponse.json({
            success: false,
            error: 'Thread ID is required for get_messages action'
          }, { status: 400 })
        }

        const messages = await assistantService.getMessages(threadId)
        return NextResponse.json({
          success: true,
          messages: messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content[0]?.type === 'text' ? msg.content[0].text.value : '',
            timestamp: new Date(msg.created_at * 1000),
            metadata: msg.metadata
          })).reverse() // Reverse to get chronological order
        })

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Thread API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process thread request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')

    if (!threadId) {
      return NextResponse.json({
        success: false,
        error: 'Thread ID is required'
      }, { status: 400 })
    }

    const messages = await assistantService.getMessages(threadId)
    return NextResponse.json({
      success: true,
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content[0]?.type === 'text' ? msg.content[0].text.value : '',
        timestamp: new Date(msg.created_at * 1000),
        metadata: msg.metadata
      })).reverse() // Reverse to get chronological order
    })
  } catch (error) {
    console.error('Thread GET error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve thread messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}