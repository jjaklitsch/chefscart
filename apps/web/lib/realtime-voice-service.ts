import { EventEmitter } from 'events'

export enum VoiceState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting', 
  CONNECTED = 'connected',
  LISTENING = 'listening',      // User can speak, AI silent
  AI_SPEAKING = 'ai_speaking',  // AI speaking, mic ducked
  PROCESSING = 'processing',    // Brief transition state
  INTERRUPTED = 'interrupted'   // User interrupted AI
}

export interface RealtimeVoiceConfig {
  voice: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse'
  instructions?: string
  temperature?: number
  turnDetection?: {
    type: 'server_vad' | 'none'
    threshold?: number
    prefixPaddingMs?: number
    silenceDurationMs?: number
  }
}

export interface AudioChunk {
  data: ArrayBuffer
  timestamp: number
}

export class RealtimeVoiceService extends EventEmitter {
  private websocket: WebSocket | null = null
  private state: VoiceState = VoiceState.DISCONNECTED
  private config: RealtimeVoiceConfig
  
  // Audio contexts - separate for echo cancellation
  private inputAudioContext: AudioContext | null = null
  private outputAudioContext: AudioContext | null = null
  
  // Audio nodes
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private gainNode: GainNode | null = null
  private analyserNode: AnalyserNode | null = null
  
  // Audio playback queue for real-time streaming
  private audioQueue: AudioChunk[] = []
  private isPlayingAudio = false
  private nextPlayTime = 0
  
  // State management
  private lastUserAudioTime = 0
  private vadThreshold = 0.01 // Voice activity detection threshold
  private isUserSpeaking = false
  
  constructor(config: RealtimeVoiceConfig) {
    super()
    this.config = {
      voice: 'alloy',
      temperature: 0.9,
      instructions: 'You are Carter, a friendly AI sous-chef. Keep responses concise and conversational. Help with meal planning.',
      turnDetection: {
        type: 'server_vad',
        threshold: 0.5,
        prefixPaddingMs: 300,
        silenceDurationMs: 300
      },
      ...config
    }
  }

  async connect(): Promise<void> {
    if (this.state !== VoiceState.DISCONNECTED) {
      throw new Error('Already connected or connecting')
    }

    this.setState(VoiceState.CONNECTING)
    
    try {
      // Initialize audio contexts first
      await this.initializeAudioContexts()
      
      // Get WebSocket URL from API
      const response = await fetch('/api/voice/realtime-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to get realtime token')
      }

      const { token, url } = await response.json()

      // Create WebSocket connection
      this.websocket = new WebSocket(url, [], {
        headers: {
          'Authorization': `Bearer ${token}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      } as any)

      this.setupWebSocketHandlers()
      
    } catch (error) {
      this.setState(VoiceState.DISCONNECTED)
      this.emit('error', error)
      throw error
    }
  }

  private async initializeAudioContexts(): Promise<void> {
    // Input context with aggressive echo cancellation
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000,
      latencyHint: 'interactive'
    })

    // Output context for AI audio playback
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000,
      latencyHint: 'interactive'
    })

    // Get user media with enhanced echo cancellation
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
        googEchoCancellation: true,
        googNoiseSuppression: true,
        googAutoGainControl: false,
        googHighpassFilter: true,
        googTypingNoiseDetection: true
      }
    })

    // Set up audio nodes for input processing
    const source = this.inputAudioContext.createMediaStreamSource(this.mediaStream)
    
    // Gain node for dynamic volume control (echo prevention)
    this.gainNode = this.inputAudioContext.createGain()
    this.gainNode.gain.value = 1.0
    
    // Analyser for voice activity detection
    this.analyserNode = this.inputAudioContext.createAnalyser()
    this.analyserNode.fftSize = 256
    this.analyserNode.smoothingTimeConstant = 0.3
    
    // Connect the audio graph
    source.connect(this.gainNode)
    this.gainNode.connect(this.analyserNode)
    
    // Set up MediaRecorder for streaming to WebSocket
    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 24000
    })

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.websocket?.readyState === WebSocket.OPEN) {
        this.sendAudioData(event.data)
      }
    }

    // Start continuous recording with small chunks for real-time streaming
    this.mediaRecorder.start(100) // 100ms chunks

    // Start voice activity detection
    this.startVAD()
  }

  private setupWebSocketHandlers(): void {
    if (!this.websocket) return

    this.websocket.onopen = () => {
      this.setState(VoiceState.CONNECTED)
      this.sendSessionUpdate()
      this.emit('connected')
    }

    this.websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleWebSocketMessage(message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.websocket.onclose = () => {
      this.setState(VoiceState.DISCONNECTED)
      this.emit('disconnected')
    }

    this.websocket.onerror = (error) => {
      this.emit('error', error)
    }
  }

  private sendSessionUpdate(): void {
    if (!this.websocket) return

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
        turn_detection: this.config.turnDetection,
        tools: [],
        tool_choice: 'auto',
        temperature: this.config.temperature,
        max_response_output_tokens: 1024
      }
    }

    this.websocket.send(JSON.stringify(sessionUpdate))
  }

  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'session.created':
        console.log('Session created:', message.session.id)
        this.setState(VoiceState.LISTENING)
        break

      case 'input_audio_buffer.speech_started':
        this.handleUserSpeechStart()
        break

      case 'input_audio_buffer.speech_stopped':
        this.handleUserSpeechEnd()
        break

      case 'response.audio.delta':
        if (message.delta) {
          this.handleAudioDelta(message.delta)
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
        this.handleResponseComplete()
        break

      case 'input_audio_buffer.committed':
        this.setState(VoiceState.PROCESSING)
        break

      case 'conversation.item.input_audio_transcription.completed':
        this.emit('user_transcript', {
          text: message.transcript,
          isUser: true
        })
        break

      case 'error':
        this.emit('error', new Error(message.error?.message || 'Unknown error'))
        break

      default:
        console.log('Unhandled message type:', message.type, message)
    }
  }

  private handleUserSpeechStart(): void {
    console.log('🟢 User speech started')
    this.isUserSpeaking = true
    this.lastUserAudioTime = Date.now()
    
    // If AI is speaking, interrupt it
    if (this.state === VoiceState.AI_SPEAKING) {
      this.interruptAI()
    } else {
      this.setState(VoiceState.LISTENING)
    }
    
    this.emit('user_speech_start')
  }

  private handleUserSpeechEnd(): void {
    console.log('🔴 User speech ended')
    this.isUserSpeaking = false
    this.setState(VoiceState.PROCESSING)
    this.emit('user_speech_end')
  }

  private handleAudioDelta(audioBase64: string): void {
    if (this.state === VoiceState.INTERRUPTED) {
      // Ignore audio if we're interrupted
      return
    }

    if (this.state !== VoiceState.AI_SPEAKING) {
      this.setState(VoiceState.AI_SPEAKING)
      this.duckMicrophone() // Reduce mic gain during AI speech
    }

    // Decode and queue audio for real-time playback
    try {
      const audioData = this.decodeAudioDelta(audioBase64)
      this.queueAudioChunk({
        data: audioData,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error decoding audio delta:', error)
    }
  }

  private handleResponseComplete(): void {
    console.log('✅ AI response complete')
    this.setState(VoiceState.LISTENING)
    this.unduckMicrophone() // Restore mic gain
    this.emit('response_complete')
  }

  private interruptAI(): void {
    console.log('⚡ Interrupting AI response')
    this.setState(VoiceState.INTERRUPTED)
    
    // Cancel current response
    if (this.websocket) {
      this.websocket.send(JSON.stringify({ type: 'response.cancel' }))
    }
    
    // Clear audio queue
    this.audioQueue = []
    this.isPlayingAudio = false
    
    // Stop any current audio playback
    if (this.outputAudioContext) {
      // This will stop all current audio sources
      this.outputAudioContext.suspend().then(() => {
        this.outputAudioContext?.resume()
      })
    }
    
    this.unduckMicrophone()
    this.emit('ai_interrupted')
    
    // Transition back to listening after brief delay
    setTimeout(() => {
      if (this.state === VoiceState.INTERRUPTED) {
        this.setState(VoiceState.LISTENING)
      }
    }, 100)
  }

  private duckMicrophone(): void {
    // Reduce microphone gain during AI speech to prevent feedback
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(0.2, this.inputAudioContext!.currentTime, 0.05)
    }
  }

  private unduckMicrophone(): void {
    // Restore full microphone gain
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(1.0, this.inputAudioContext!.currentTime, 0.1)
    }
  }

  private decodeAudioDelta(audioBase64: string): ArrayBuffer {
    // Decode base64 to ArrayBuffer
    const binaryString = atob(audioBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  private queueAudioChunk(chunk: AudioChunk): void {
    this.audioQueue.push(chunk)
    
    if (!this.isPlayingAudio) {
      this.playNextAudioChunk()
    }
  }

  private async playNextAudioChunk(): Promise<void> {
    if (this.audioQueue.length === 0 || !this.outputAudioContext) {
      this.isPlayingAudio = false
      return
    }

    this.isPlayingAudio = true
    const chunk = this.audioQueue.shift()!

    try {
      // Convert ArrayBuffer to audio buffer
      const audioData = new Int16Array(chunk.data)
      const floatArray = new Float32Array(audioData.length)
      
      // Convert Int16 to Float32
      for (let i = 0; i < audioData.length; i++) {
        floatArray[i] = audioData[i] / 32768.0
      }

      if (floatArray.length === 0) {
        this.playNextAudioChunk()
        return
      }

      // Create audio buffer
      const audioBuffer = this.outputAudioContext.createBuffer(1, floatArray.length, 24000)
      audioBuffer.copyToChannel(floatArray, 0)

      // Create and configure source
      const source = this.outputAudioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(this.outputAudioContext.destination)

      // Schedule playback
      const currentTime = this.outputAudioContext.currentTime
      const playTime = Math.max(currentTime, this.nextPlayTime)
      
      source.onended = () => {
        this.playNextAudioChunk()
      }

      source.start(playTime)
      this.nextPlayTime = playTime + audioBuffer.duration

    } catch (error) {
      console.error('Error playing audio chunk:', error)
      this.playNextAudioChunk()
    }
  }

  private async sendAudioData(audioBlob: Blob): Promise<void> {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return
    
    try {
      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer()
      
      // Convert to base64
      const base64Audio = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      )

      // Send to WebSocket
      this.websocket.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Audio
      }))

    } catch (error) {
      console.error('Error sending audio data:', error)
    }
  }

  private startVAD(): void {
    if (!this.analyserNode) return

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)
    
    const checkVAD = () => {
      if (!this.analyserNode || this.state === VoiceState.DISCONNECTED) return

      this.analyserNode.getByteFrequencyData(dataArray)
      
      // Calculate RMS (root mean square) for voice activity
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += (dataArray[i] / 255) ** 2
      }
      const rms = Math.sqrt(sum / dataArray.length)
      
      // Emit audio level for UI visualization
      this.emit('audio_level', rms)
      
      // Simple VAD logic (can be enhanced)
      const isVoiceDetected = rms > this.vadThreshold
      
      if (isVoiceDetected && !this.isUserSpeaking && this.state === VoiceState.LISTENING) {
        // Additional logic could go here for client-side VAD
      }
      
      requestAnimationFrame(checkVAD)
    }
    
    checkVAD()
  }

  private setState(newState: VoiceState): void {
    if (this.state !== newState) {
      const oldState = this.state
      this.state = newState
      console.log(`Voice state: ${oldState} → ${newState}`)
      this.emit('state_change', { from: oldState, to: newState })
    }
  }

  // Public methods
  getState(): VoiceState {
    return this.state
  }

  isConnected(): boolean {
    return this.state !== VoiceState.DISCONNECTED && this.state !== VoiceState.CONNECTING
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    if (this.inputAudioContext) {
      this.inputAudioContext.close()
      this.inputAudioContext = null
    }

    if (this.outputAudioContext) {
      this.outputAudioContext.close()
      this.outputAudioContext = null
    }

    this.audioQueue = []
    this.isPlayingAudio = false
    this.setState(VoiceState.DISCONNECTED)
  }

  // Force commit audio (for testing)
  commitAudio(): void {
    if (this.websocket) {
      this.websocket.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }))
    }
  }

  // Manual response generation (for testing)
  generateResponse(): void {
    if (this.websocket) {
      this.websocket.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio']
        }
      }))
    }
  }
}

// Singleton instance
let realtimeVoiceInstance: RealtimeVoiceService | null = null

export function getRealtimeVoiceService(config?: RealtimeVoiceConfig): RealtimeVoiceService {
  if (!realtimeVoiceInstance) {
    realtimeVoiceInstance = new RealtimeVoiceService(config || { voice: 'alloy' })
  }
  return realtimeVoiceInstance
}

export function destroyRealtimeVoiceService(): void {
  if (realtimeVoiceInstance) {
    realtimeVoiceInstance.disconnect()
    realtimeVoiceInstance = null
  }
}