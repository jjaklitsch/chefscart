import { EventEmitter } from 'events'

export interface RealtimeVoiceEvent {
  type: 'speech_start' | 'speech_end' | 'transcript' | 'response' | 'error' | 'connect' | 'disconnect'
  data?: any
}

export interface RealtimeConfig {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'maple'
  model?: string
  instructions?: string
}

export class OpenAIRealtimeService extends EventEmitter {
  private websocket: WebSocket | null = null
  private isConnected = false
  private config: RealtimeConfig
  private sessionId: string | null = null

  constructor(config: RealtimeConfig) {
    super()
    this.config = {
      model: 'gpt-4o-realtime-preview',
      instructions: 'You are Carter, a friendly AI sous-chef assistant for ChefsCart. Keep responses concise and conversational (1-2 sentences max). Ask follow-up questions to keep the conversation flowing. When helping with meal planning, anticipate common needs like dietary restrictions, cooking skill level, time constraints, and family preferences. Be enthusiastic about food and cooking, and respond immediately when you hear the user start speaking.',
      ...config
    }
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return
    }

    try {
      // Get WebSocket URL from our API endpoint
      const response = await fetch('/api/voice/realtime-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to get realtime token')
      }

      const { token, url } = await response.json()

      this.websocket = new WebSocket(url, [], {
        headers: {
          'Authorization': `Bearer ${token}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      } as any)

      this.websocket.onopen = () => {
        this.isConnected = true
        this.emit('connect')
        this.sendSessionUpdate()
      }

      this.websocket.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data))
      }

      this.websocket.onclose = () => {
        this.isConnected = false
        this.emit('disconnect')
      }

      this.websocket.onerror = (error) => {
        this.emit('error', error)
      }

    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    this.isConnected = false
  }

  private sendSessionUpdate(): void {
    if (!this.websocket || !this.isConnected) return

    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: this.config.instructions,
        voice: this.config.voice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_sample_rate: 24000,
        output_audio_sample_rate: 24000,
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 300  // Reduced for faster response
        },
        tools: [],
        tool_choice: 'auto',
        temperature: 0.9,  // Higher temperature for more natural, varied responses
        max_response_output_tokens: 1024  // Shorter responses for faster, more conversational feel
      }
    }

    this.websocket.send(JSON.stringify(sessionUpdate))
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'session.created':
        this.sessionId = message.session.id
        break

      case 'input_audio_buffer.speech_started':
        this.emit('speech_start')
        break

      case 'input_audio_buffer.speech_stopped':
        this.emit('speech_end')
        break

      case 'conversation.item.input_audio_transcription.completed':
        this.emit('transcript', {
          text: message.transcript,
          isUser: true
        })
        break

      case 'response.audio.delta':
        if (message.delta) {
          this.emit('audio_delta', {
            audio: message.delta,
            isUser: false
          })
        }
        break

      case 'response.audio_transcript.delta':
        if (message.delta) {
          this.emit('transcript_delta', {
            text: message.delta,
            isUser: false
          })
        }
        break

      case 'response.done':
        this.emit('response_complete')
        break

      case 'error':
        this.emit('error', new Error(message.error?.message || 'Unknown error'))
        break

      default:
        console.log('Unhandled message type:', message.type)
    }
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (!this.websocket || !this.isConnected) return

    // Convert ArrayBuffer to base64
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioData))
    )

    const audioMessage = {
      type: 'input_audio_buffer.append',
      audio: base64Audio
    }

    this.websocket.send(JSON.stringify(audioMessage))
  }

  commitAudio(): void {
    if (!this.websocket || !this.isConnected) return

    const commitMessage = {
      type: 'input_audio_buffer.commit'
    }

    this.websocket.send(JSON.stringify(commitMessage))
  }

  sendText(text: string): void {
    if (!this.websocket || !this.isConnected) return

    const textMessage = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text
          }
        ]
      }
    }

    this.websocket.send(JSON.stringify(textMessage))

    // Trigger response
    const responseMessage = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        instructions: 'Please respond to the user\'s message.'
      }
    }

    this.websocket.send(JSON.stringify(responseMessage))
  }

  generateResponse(): void {
    if (!this.websocket || !this.isConnected) return

    const responseMessage = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    }

    this.websocket.send(JSON.stringify(responseMessage))
  }

  cancelResponse(): void {
    if (!this.websocket || !this.isConnected) return

    const cancelMessage = {
      type: 'response.cancel'
    }

    this.websocket.send(JSON.stringify(cancelMessage))
  }

  truncateItem(itemId: string): void {
    if (!this.websocket || !this.isConnected) return

    const truncateMessage = {
      type: 'conversation.item.truncate',
      item_id: itemId,
      content_index: 0,
      audio_end_ms: 0
    }

    this.websocket.send(JSON.stringify(truncateMessage))
  }

  isConnectedToRealtime(): boolean {
    return this.isConnected
  }
}

// Singleton instance
let realtimeServiceInstance: OpenAIRealtimeService | null = null

export function getRealtimeService(config?: RealtimeConfig): OpenAIRealtimeService {
  if (!realtimeServiceInstance) {
    realtimeServiceInstance = new OpenAIRealtimeService(config || { voice: 'maple' })
  }
  return realtimeServiceInstance
}

export function destroyRealtimeService(): void {
  if (realtimeServiceInstance) {
    realtimeServiceInstance.disconnect()
    realtimeServiceInstance = null
  }
}