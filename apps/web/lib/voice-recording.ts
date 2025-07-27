import { VoiceRecordingState, AudioPermissionState } from '../types'

export class VoiceRecordingService {
  private mediaRecorder: MediaRecorder | null = null
  private audioStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private audioLevelInterval: NodeJS.Timeout | null = null
  private recordingStartTime: number = 0
  private durationInterval: NodeJS.Timeout | null = null
  private recordedChunks: Blob[] = []

  private state: VoiceRecordingState = {
    isRecording: false,
    isInitialized: false,
    audioLevel: 0,
    duration: 0
  }

  private permissionState: AudioPermissionState = {
    hasPermission: false,
    isRequesting: false
  }

  private stateListeners: Set<(state: VoiceRecordingState) => void> = new Set()
  private permissionListeners: Set<(state: AudioPermissionState) => void> = new Set()

  constructor() {
    this.checkBrowserSupport()
  }

  private checkBrowserSupport(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      this.updateState({
        error: 'Voice recording requires a browser environment'
      })
      return
    }

    const isSupported = !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    )

    if (!isSupported) {
      this.updateState({
        error: 'Voice recording is not supported in this browser'
      })
    }
  }

  private updateState(newState: Partial<VoiceRecordingState>): void {
    this.state = { ...this.state, ...newState }
    this.stateListeners.forEach(listener => listener(this.state))
  }

  private updatePermissionState(newState: Partial<AudioPermissionState>): void {
    this.permissionState = { ...this.permissionState, ...newState }
    this.permissionListeners.forEach(listener => listener(this.permissionState))
  }

  public onStateChange(callback: (state: VoiceRecordingState) => void): () => void {
    this.stateListeners.add(callback)
    // Call immediately with current state
    callback(this.state)

    // Return unsubscribe function
    return () => {
      this.stateListeners.delete(callback)
    }
  }

  public onPermissionChange(callback: (state: AudioPermissionState) => void): () => void {
    this.permissionListeners.add(callback)
    // Call immediately with current state
    callback(this.permissionState)

    // Return unsubscribe function
    return () => {
      this.permissionListeners.delete(callback)
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      this.updatePermissionState({ 
        hasPermission: false, 
        isRequesting: false,
        error: 'Browser environment required'
      })
      return false
    }

    if (this.permissionState.hasPermission) {
      return true
    }

    this.updatePermissionState({ isRequesting: true, error: undefined })

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimal for Whisper
        } 
      })
      
      // Test successful, clean up
      stream.getTracks().forEach(track => track.stop())
      
      this.updatePermissionState({ 
        hasPermission: true, 
        isRequesting: false 
      })
      
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Permission denied'
      this.updatePermissionState({ 
        hasPermission: false, 
        isRequesting: false, 
        error: errorMessage 
      })
      
      return false
    }
  }

  public async initialize(): Promise<boolean> {
    if (this.state.isInitialized) {
      return true
    }

    try {
      // Request permission first
      const hasPermission = await this.requestPermission()
      if (!hasPermission) {
        return false
      }

      // Get audio stream
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      })

      // Set up audio context for level monitoring
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = this.audioContext.createMediaStreamSource(this.audioStream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)

      // Set up MediaRecorder
      const options: MediaRecorderOptions = {}
      
      // Try different MIME types for cross-browser compatibility
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ]

      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          options.mimeType = mimeType
          break
        }
      }

      this.mediaRecorder = new MediaRecorder(this.audioStream, options)

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = () => {
        this.stopAudioLevelMonitoring()
        this.stopDurationTimer()
        this.updateState({
          isRecording: false,
          audioLevel: 0,
          duration: 0
        })
      }

      this.mediaRecorder.onerror = (event) => {
        this.updateState({
          error: `Recording error: ${(event as any).error?.message || 'Unknown error'}`,
          isRecording: false
        })
      }

      this.updateState({ 
        isInitialized: true,
        error: undefined
      })

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize recording'
      this.updateState({
        error: errorMessage,
        isInitialized: false
      })
      return false
    }
  }

  public async startRecording(): Promise<boolean> {
    if (!this.state.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return false
      }
    }

    if (!this.mediaRecorder || this.state.isRecording) {
      return false
    }

    try {
      this.recordedChunks = []
      this.recordingStartTime = Date.now()
      
      this.mediaRecorder.start(100) // Collect data every 100ms
      
      this.updateState({
        isRecording: true,
        duration: 0,
        error: undefined
      })

      this.startAudioLevelMonitoring()
      this.startDurationTimer()

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording'
      this.updateState({
        error: errorMessage,
        isRecording: false
      })
      return false
    }
  }

  public stopRecording(): Blob | null {
    if (!this.mediaRecorder || !this.state.isRecording) {
      return null
    }

    this.mediaRecorder.stop()
    
    // Create blob from recorded chunks
    if (this.recordedChunks.length > 0) {
      const mimeType = this.mediaRecorder.mimeType || 'audio/webm'
      return new Blob(this.recordedChunks, { type: mimeType })
    }

    return null
  }

  private startAudioLevelMonitoring(): void {
    if (!this.analyser) return

    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    this.audioLevelInterval = setInterval(() => {
      if (!this.analyser || !this.state.isRecording) return

      this.analyser.getByteFrequencyData(dataArray)
      
      // Calculate RMS (Root Mean Square) for audio level
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i]
      }
      const rms = Math.sqrt(sum / bufferLength)
      const audioLevel = Math.min(100, (rms / 128) * 100) // Normalize to 0-100

      this.updateState({ audioLevel })
    }, 50) // Update every 50ms for smooth feedback
  }

  private stopAudioLevelMonitoring(): void {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval)
      this.audioLevelInterval = null
    }
  }

  private startDurationTimer(): void {
    this.durationInterval = setInterval(() => {
      if (!this.state.isRecording) return
      
      const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000)
      this.updateState({ duration })
    }, 100)
  }

  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval)
      this.durationInterval = null
    }
  }

  public cleanup(): void {
    // Stop recording if active
    if (this.state.isRecording) {
      this.stopRecording()
    }

    // Clean up intervals
    this.stopAudioLevelMonitoring()
    this.stopDurationTimer()

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    // Stop audio stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop())
      this.audioStream = null
    }

    // Reset state
    this.mediaRecorder = null
    this.analyser = null
    this.recordedChunks = []

    this.updateState({
      isRecording: false,
      isInitialized: false,
      audioLevel: 0,
      duration: 0,
      error: undefined
    })
  }

  public getState(): VoiceRecordingState {
    return { ...this.state }
  }

  public getPermissionState(): AudioPermissionState {
    return { ...this.permissionState }
  }
}

// Singleton instance
let voiceRecordingServiceInstance: VoiceRecordingService | null = null

export function getVoiceRecordingService(): VoiceRecordingService {
  if (!voiceRecordingServiceInstance) {
    voiceRecordingServiceInstance = new VoiceRecordingService()
  }
  return voiceRecordingServiceInstance
}