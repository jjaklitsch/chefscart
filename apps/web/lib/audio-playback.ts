import { VoiceSynthesisRequest } from '../types'

export interface AudioQueueItem {
  id: string
  text: string
  voice?: VoiceSynthesisRequest['voice']
  speed?: number
  priority?: 'high' | 'normal' | 'low'
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

export interface AudioPlaybackState {
  isPlaying: boolean
  currentItem: AudioQueueItem | null
  queueLength: number
  volume: number
  error?: string
}

export class AudioPlaybackService {
  private audioContext: AudioContext | null = null
  private currentAudio: HTMLAudioElement | null = null
  private audioQueue: AudioQueueItem[] = []
  private isProcessingQueue = false
  private volume = 0.8
  
  private state: AudioPlaybackState = {
    isPlaying: false,
    currentItem: null,
    queueLength: 0,
    volume: 0.8
  }

  private stateListeners: Set<(state: AudioPlaybackState) => void> = new Set()

  constructor() {
    this.initializeAudioContext()
  }

  private initializeAudioContext(): void {
    try {
      // Only initialize if running in browser environment
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
    } catch (error) {
      console.warn('AudioContext not supported:', error)
    }
  }

  private updateState(newState: Partial<AudioPlaybackState>): void {
    this.state = { ...this.state, ...newState }
    this.stateListeners.forEach(listener => listener(this.state))
  }

  public onStateChange(callback: (state: AudioPlaybackState) => void): () => void {
    this.stateListeners.add(callback)
    // Call immediately with current state
    callback(this.state)

    // Return unsubscribe function
    return () => {
      this.stateListeners.delete(callback)
    }
  }

  private async synthesizeSpeech(text: string, voice?: VoiceSynthesisRequest['voice'], speed?: number): Promise<ArrayBuffer> {
    const request: VoiceSynthesisRequest = {
      text,
      voice: voice || 'alloy',
      speed: speed || 1.0
    }

    try {
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorData.error || `Voice synthesis failed: HTTP ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Empty audio response from voice synthesis')
      }

      return arrayBuffer
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Voice synthesis service unavailable')
      }
      throw error
    }
  }

  private createAudioFromBuffer(buffer: ArrayBuffer): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      try {
        if (buffer.byteLength === 0) {
          reject(new Error('Empty audio buffer'))
          return
        }

        const blob = new Blob([buffer], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        const audio = new HTMLAudioElement()
        
        audio.volume = this.volume
        audio.preload = 'auto'
        
        const cleanup = () => {
          URL.revokeObjectURL(url)
        }
        
        audio.addEventListener('loadeddata', () => {
          resolve(audio)
        }, { once: true })
        
        audio.addEventListener('error', (event) => {
          cleanup()
          const target = event.target as HTMLAudioElement
          const error = target.error
          let errorMessage = 'Failed to load audio'
          
          if (error) {
            switch (error.code) {
              case error.MEDIA_ERR_ABORTED:
                errorMessage = 'Audio loading was aborted'
                break
              case error.MEDIA_ERR_NETWORK:
                errorMessage = 'Network error while loading audio'
                break
              case error.MEDIA_ERR_DECODE:
                errorMessage = 'Error decoding audio data'
                break
              case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Audio format not supported'
                break
            }
          }
          
          reject(new Error(errorMessage))
        }, { once: true })
        
        audio.src = url
      } catch (error) {
        reject(new Error(`Failed to create audio: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  private async playAudioItem(item: AudioQueueItem): Promise<void> {
    try {
      this.updateState({
        isPlaying: true,
        currentItem: item
      })
      
      // Clear any previous errors
      if (this.state.error) {
        const newState = { ...this.state }
        delete newState.error
        this.state = newState
        this.stateListeners.forEach(listener => listener(this.state))
      }

      item.onStart?.()

      // Synthesize speech with timeout
      const synthesisPromise = this.synthesizeSpeech(item.text, item.voice, item.speed)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Voice synthesis timeout')), 30000)
      })
      
      const audioBuffer = await Promise.race([synthesisPromise, timeoutPromise])
      
      // Create audio element
      const audio = await this.createAudioFromBuffer(audioBuffer)
      this.currentAudio = audio

      // Set up event listeners
      const handleEnded = () => {
        this.cleanup()
        item.onEnd?.()
        this.processNextInQueue()
      }

      const handleError = (error: Event) => {
        const target = error.target as HTMLAudioElement
        let errorMessage = 'Audio playback failed'
        
        if (target.error) {
          switch (target.error.code) {
            case target.error.MEDIA_ERR_ABORTED:
              errorMessage = 'Playback was aborted'
              break
            case target.error.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error during playback'
              break
            case target.error.MEDIA_ERR_DECODE:
              errorMessage = 'Error decoding audio'
              break
            case target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Audio format not supported'
              break
          }
        }
        
        this.updateState({ error: errorMessage })
        item.onError?.(errorMessage)
        this.cleanup()
        this.processNextInQueue()
      }

      audio.addEventListener('ended', handleEnded, { once: true })
      audio.addEventListener('error', handleError, { once: true })

      // Resume audio context if needed (for browsers with autoplay restrictions)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume()
        } catch (error) {
          console.warn('Failed to resume audio context:', error)
        }
      }

      // Play audio with retry logic
      try {
        await audio.play()
      } catch (playError) {
        // Handle specific play errors
        if (playError instanceof DOMException) {
          switch (playError.name) {
            case 'NotAllowedError':
              throw new Error('Audio playback not allowed by browser. User interaction required.')
            case 'NotSupportedError':
              throw new Error('Audio format not supported')
            case 'AbortError':
              throw new Error('Audio playback was aborted')
            default:
              throw new Error(`Playback failed: ${playError.message}`)
          }
        }
        throw playError
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown playback error'
      this.updateState({ error: errorMessage })
      item.onError?.(errorMessage)
      this.cleanup()
      this.processNextInQueue()
    }
  }

  private processNextInQueue(): void {
    if (this.isProcessingQueue || this.audioQueue.length === 0) {
      this.updateState({
        isPlaying: false,
        currentItem: null,
        queueLength: this.audioQueue.length
      })
      this.isProcessingQueue = false
      return
    }

    this.isProcessingQueue = true
    
    // Sort queue by priority (high -> normal -> low)
    this.audioQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 }
      const aPriority = priorityOrder[a.priority || 'normal']
      const bPriority = priorityOrder[b.priority || 'normal']
      return bPriority - aPriority
    })

    const nextItem = this.audioQueue.shift()
    if (nextItem) {
      this.updateState({ queueLength: this.audioQueue.length })
      this.playAudioItem(nextItem)
    } else {
      this.isProcessingQueue = false
      this.updateState({
        isPlaying: false,
        currentItem: null,
        queueLength: 0
      })
    }
  }

  public async speak(
    text: string, 
    options: {
      voice?: VoiceSynthesisRequest['voice']
      speed?: number
      priority?: 'high' | 'normal' | 'low'
      interrupt?: boolean
      onStart?: () => void
      onEnd?: () => void
      onError?: (error: string) => void
    } = {}
  ): Promise<void> {
    if (!text.trim()) {
      return
    }

    const item: AudioQueueItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: text.trim(),
      ...(options.voice && { voice: options.voice }),
      ...(options.speed && { speed: options.speed }),
      priority: options.priority || 'normal',
      ...(options.onStart && { onStart: options.onStart }),
      ...(options.onEnd && { onEnd: options.onEnd }),
      ...(options.onError && { onError: options.onError })
    }

    // If interrupt is true, stop current playback and clear queue
    if (options.interrupt) {
      this.stop()
      this.clearQueue()
    }

    // Add to queue
    this.audioQueue.push(item)
    this.updateState({ queueLength: this.audioQueue.length })

    // Process queue if not already processing
    if (!this.isProcessingQueue && !this.state.isPlaying) {
      this.processNextInQueue()
    }
  }

  public stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
    }
    this.cleanup()
    this.updateState({
      isPlaying: false,
      currentItem: null
    })
  }

  public pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause()
      this.updateState({ isPlaying: false })
    }
  }

  public resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(error => {
        this.updateState({ error: 'Failed to resume playback' })
      })
    }
  }

  public clearQueue(): void {
    this.audioQueue = []
    this.updateState({ queueLength: 0 })
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    this.updateState({ volume: this.volume })
    
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume
    }
  }

  public getVolume(): number {
    return this.volume
  }

  public getState(): AudioPlaybackState {
    return { ...this.state }
  }

  public getQueueLength(): number {
    return this.audioQueue.length
  }

  public isEmpty(): boolean {
    return this.audioQueue.length === 0 && !this.state.isPlaying
  }

  private cleanup(): void {
    if (this.currentAudio) {
      const audio = this.currentAudio
      this.currentAudio = null
      
      // Clean up blob URL to prevent memory leaks
      if (audio.src && audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src)
      }
      
      // Remove event listeners
      audio.removeEventListener('ended', () => {})
      audio.removeEventListener('error', () => {})
    }
  }

  public destroy(): void {
    this.stop()
    this.clearQueue()
    this.cleanup()
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.stateListeners.clear()
  }
}

// Singleton instance
let audioPlaybackServiceInstance: AudioPlaybackService | null = null

export function getAudioPlaybackService(): AudioPlaybackService {
  // Only create instance in browser environment
  if (typeof window === 'undefined') {
    throw new Error('AudioPlaybackService can only be used in browser environment')
  }
  
  if (!audioPlaybackServiceInstance) {
    audioPlaybackServiceInstance = new AudioPlaybackService()
  }
  return audioPlaybackServiceInstance
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (audioPlaybackServiceInstance) {
      audioPlaybackServiceInstance.destroy()
    }
  })
}