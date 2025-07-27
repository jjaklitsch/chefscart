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
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
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

    const response = await fetch('/api/voice/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return await response.arrayBuffer()
  }

  private createAudioFromBuffer(buffer: ArrayBuffer): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new HTMLAudioElement()
      
      audio.volume = this.volume
      audio.preload = 'auto'
      
      audio.addEventListener('loadeddata', () => {
        resolve(audio)
      }, { once: true })
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load audio'))
      }, { once: true })
      
      audio.src = url
    })
  }

  private async playAudioItem(item: AudioQueueItem): Promise<void> {
    try {
      this.updateState({
        isPlaying: true,
        currentItem: item,
        error: undefined
      })

      item.onStart?.()

      // Synthesize speech
      const audioBuffer = await this.synthesizeSpeech(item.text, item.voice, item.speed)
      
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
        const errorMessage = 'Audio playback failed'
        this.updateState({ error: errorMessage })
        item.onError?.(errorMessage)
        this.cleanup()
        this.processNextInQueue()
      }

      audio.addEventListener('ended', handleEnded, { once: true })
      audio.addEventListener('error', handleError, { once: true })

      // Resume audio context if needed (for browsers with autoplay restrictions)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Play audio
      await audio.play()

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
      voice: options.voice,
      speed: options.speed,
      priority: options.priority || 'normal',
      onStart: options.onStart,
      onEnd: options.onEnd,
      onError: options.onError
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
      currentItem: null,
      error: undefined
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