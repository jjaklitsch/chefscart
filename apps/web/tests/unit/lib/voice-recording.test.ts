import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VoiceRecordingService } from '../../../lib/voice-recording'

// Mock Web APIs
const mockMediaDevices = {
  getUserMedia: vi.fn(),
}

const mockMediaRecorder = vi.fn()
const mockAudioContext = vi.fn()

// Mock global objects
Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: mockMediaDevices,
  },
  writable: true,
})

Object.defineProperty(global, 'MediaRecorder', {
  value: mockMediaRecorder,
  writable: true,
})

Object.defineProperty(global, 'AudioContext', {
  value: mockAudioContext,
  writable: true,
})

Object.defineProperty(global, 'window', {
  value: {
    AudioContext: mockAudioContext,
    webkitAudioContext: mockAudioContext,
  },
  writable: true,
})

describe('VoiceRecordingService', () => {
  let service: VoiceRecordingService
  let mockStream: MediaStream
  let mockRecorder: MediaRecorder

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mock stream
    mockStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }]),
    } as any

    // Setup mock recorder
    mockRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      mimeType: 'audio/webm',
      state: 'inactive',
    } as any

    // Setup mock audio context
    const mockAudioContextInstance = {
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
      })),
      createAnalyser: vi.fn(() => ({
        fftSize: 256,
        frequencyBinCount: 128,
        getByteFrequencyData: vi.fn(),
      })),
      close: vi.fn(),
      state: 'running',
    }

    mockAudioContext.mockReturnValue(mockAudioContextInstance)
    mockMediaRecorder.mockReturnValue(mockRecorder)
    mockMediaDevices.getUserMedia.mockResolvedValue(mockStream)

    // Mock MediaRecorder.isTypeSupported
    vi.mocked(MediaRecorder).isTypeSupported = vi.fn(() => true)

    service = new VoiceRecordingService()
  })

  afterEach(() => {
    service.cleanup()
  })

  describe('initialization', () => {
    it('should create a new service instance', () => {
      expect(service).toBeInstanceOf(VoiceRecordingService)
    })

    it('should have initial state', () => {
      const state = service.getState()
      expect(state.isRecording).toBe(false)
      expect(state.isInitialized).toBe(false)
      expect(state.audioLevel).toBe(0)
      expect(state.duration).toBe(0)
    })

    it('should have initial permission state', () => {
      const permissionState = service.getPermissionState()
      expect(permissionState.hasPermission).toBe(false)
      expect(permissionState.isRequesting).toBe(false)
    })
  })

  describe('permission handling', () => {
    it('should request microphone permission successfully', async () => {
      const hasPermission = await service.requestPermission()
      
      expect(hasPermission).toBe(true)
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      })
    })

    it('should handle permission denial', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'))
      
      const hasPermission = await service.requestPermission()
      
      expect(hasPermission).toBe(false)
      const permissionState = service.getPermissionState()
      expect(permissionState.hasPermission).toBe(false)
      expect(permissionState.error).toBe('Permission denied')
    })

    it('should return true if permission already granted', async () => {
      // First request
      await service.requestPermission()
      
      // Second request should return immediately
      const hasPermission = await service.requestPermission()
      expect(hasPermission).toBe(true)
    })
  })

  describe('service initialization', () => {
    it('should initialize successfully with permission', async () => {
      const initialized = await service.initialize()
      
      expect(initialized).toBe(true)
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalled()
      expect(mockAudioContext).toHaveBeenCalled()
      expect(mockMediaRecorder).toHaveBeenCalled()
      
      const state = service.getState()
      expect(state.isInitialized).toBe(true)
    })

    it('should fail to initialize without permission', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'))
      
      const initialized = await service.initialize()
      
      expect(initialized).toBe(false)
      const state = service.getState()
      expect(state.isInitialized).toBe(false)
    })

    it('should return true if already initialized', async () => {
      await service.initialize()
      const secondInit = await service.initialize()
      
      expect(secondInit).toBe(true)
    })
  })

  describe('recording functionality', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should start recording successfully', async () => {
      const started = await service.startRecording()
      
      expect(started).toBe(true)
      expect(mockRecorder.start).toHaveBeenCalledWith(100)
      
      const state = service.getState()
      expect(state.isRecording).toBe(true)
    })

    it('should not start recording if not initialized', async () => {
      const uninitializedService = new VoiceRecordingService()
      const started = await uninitializedService.startRecording()
      
      expect(started).toBe(false)
    })

    it('should not start recording if already recording', async () => {
      await service.startRecording()
      const secondStart = await service.startRecording()
      
      expect(secondStart).toBe(false)
    })

    it('should stop recording and return blob', async () => {
      await service.startRecording()
      
      // Simulate recorded data
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
      service['recordedChunks'] = [mockBlob]
      
      const result = service.stopRecording()
      
      expect(mockRecorder.stop).toHaveBeenCalled()
      expect(result).toBeInstanceOf(Blob)
    })

    it('should return null when stopping without recorded data', async () => {
      await service.startRecording()
      
      const result = service.stopRecording()
      
      expect(result).toBeNull()
    })

    it('should return null when stopping without active recording', () => {
      const result = service.stopRecording()
      
      expect(result).toBeNull()
    })
  })

  describe('state management', () => {
    it('should notify state listeners', async () => {
      const mockListener = vi.fn()
      const unsubscribe = service.onStateChange(mockListener)
      
      // Should be called immediately with current state
      expect(mockListener).toHaveBeenCalledWith(service.getState())
      
      await service.initialize()
      
      // Should be called again when state changes
      expect(mockListener).toHaveBeenCalledTimes(2)
      
      unsubscribe()
    })

    it('should notify permission listeners', async () => {
      const mockListener = vi.fn()
      const unsubscribe = service.onPermissionChange(mockListener)
      
      expect(mockListener).toHaveBeenCalledWith(service.getPermissionState())
      
      await service.requestPermission()
      
      expect(mockListener).toHaveBeenCalledTimes(3) // Initial, requesting, granted
      
      unsubscribe()
    })

    it('should remove listeners when unsubscribed', () => {
      const mockListener = vi.fn()
      const unsubscribe = service.onStateChange(mockListener)
      
      unsubscribe()
      
      // Clear previous calls
      mockListener.mockClear()
      
      // This should not trigger the listener
      service['updateState']({ audioLevel: 50 })
      
      expect(mockListener).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    beforeEach(async () => {
      await service.initialize()
      await service.startRecording()
    })

    it('should cleanup all resources', () => {
      service.cleanup()
      
      const state = service.getState()
      expect(state.isRecording).toBe(false)
      expect(state.isInitialized).toBe(false)
      expect(state.audioLevel).toBe(0)
      expect(state.duration).toBe(0)
    })

    it('should stop active recording during cleanup', () => {
      service.cleanup()
      
      expect(mockRecorder.stop).toHaveBeenCalled()
    })

    it('should close audio context during cleanup', () => {
      const audioContext = service['audioContext']
      service.cleanup()
      
      if (audioContext) {
        expect(audioContext.close).toHaveBeenCalled()
      }
    })

    it('should stop media stream tracks during cleanup', () => {
      const track = { stop: vi.fn() }
      service['audioStream'] = { getTracks: () => [track] } as any
      
      service.cleanup()
      
      expect(track.stop).toHaveBeenCalled()
    })
  })
})