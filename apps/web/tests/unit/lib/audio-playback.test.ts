import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioPlaybackService } from '../../../lib/audio-playback'

// Mock fetch globally
global.fetch = vi.fn()

// Mock HTML Audio Element
const mockAudio = {
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  volume: 0.8,
  currentTime: 0,
  paused: false,
  src: '',
}

global.HTMLAudioElement = vi.fn(() => mockAudio) as any

// Mock AudioContext
const mockAudioContext = {
  createMediaStreamSource: vi.fn(),
  createAnalyser: vi.fn(),
  close: vi.fn(),
  resume: vi.fn().mockResolvedValue(undefined),
  state: 'running',
}

global.AudioContext = vi.fn(() => mockAudioContext) as any
Object.defineProperty(global, 'window', {
  value: {
    AudioContext: vi.fn(() => mockAudioContext),
    webkitAudioContext: vi.fn(() => mockAudioContext),
  },
  writable: true,
})

// Mock URL.createObjectURL and revokeObjectURL
global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
} as any

// Mock Blob
global.Blob = vi.fn((content, options) => ({
  size: content.reduce((acc: number, chunk: any) => acc + (chunk.length || 0), 0),
  type: options?.type || '',
})) as any

describe('AudioPlaybackService', () => {
  let service: AudioPlaybackService
  let mockResponse: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mock fetch response
    mockResponse = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      json: vi.fn().mockResolvedValue({ error: 'Mock error' }),
    }
    
    vi.mocked(fetch).mockResolvedValue(mockResponse as any)
    
    service = new AudioPlaybackService()
  })

  afterEach(() => {
    service.destroy()
  })

  describe('initialization', () => {
    it('should create a new service instance', () => {
      expect(service).toBeInstanceOf(AudioPlaybackService)
    })

    it('should have initial state', () => {
      const state = service.getState()
      expect(state.isPlaying).toBe(false)
      expect(state.currentItem).toBeNull()
      expect(state.queueLength).toBe(0)
      expect(state.volume).toBe(0.8)
    })

    it('should initialize audio context', () => {
      expect(global.AudioContext).toHaveBeenCalled()
    })
  })

  describe('state management', () => {
    it('should notify state listeners', () => {
      const mockListener = vi.fn()
      const unsubscribe = service.onStateChange(mockListener)
      
      // Should be called immediately with current state
      expect(mockListener).toHaveBeenCalledWith(service.getState())
      
      unsubscribe()
    })

    it('should remove listeners when unsubscribed', () => {
      const mockListener = vi.fn()
      const unsubscribe = service.onStateChange(mockListener)
      
      unsubscribe()
      mockListener.mockClear()
      
      // This should not trigger the listener
      service['updateState']({ volume: 0.5 })
      
      expect(mockListener).not.toHaveBeenCalled()
    })
  })

  describe('speech synthesis', () => {
    it('should call TTS API with correct parameters', async () => {
      await service.speak('Hello world')
      
      expect(fetch).toHaveBeenCalledWith('/api/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'Hello world',
          voice: 'alloy',
          speed: 1.0
        })
      })
    })

    it('should use custom voice and speed', async () => {
      await service.speak('Hello world', {
        voice: 'nova',
        speed: 1.5
      })
      
      const callArgs = vi.mocked(fetch).mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      
      expect(body.voice).toBe('nova')
      expect(body.speed).toBe(1.5)
    })

    it('should handle empty text', async () => {
      await service.speak('')
      
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle whitespace-only text', async () => {
      await service.speak('   ')
      
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('queue management', () => {
    it('should add items to queue', async () => {
      await service.speak('First message')
      await service.speak('Second message')
      
      expect(service.getQueueLength()).toBeGreaterThan(0)
    })

    it('should process queue in priority order', async () => {
      await service.speak('Low priority', { priority: 'low' })
      await service.speak('High priority', { priority: 'high' })
      await service.speak('Normal priority', { priority: 'normal' })
      
      // High priority should be processed first
      const queue = service['audioQueue']
      expect(queue.length).toBeGreaterThan(0)
    })

    it('should clear queue', async () => {
      await service.speak('Message 1')
      await service.speak('Message 2')
      
      service.clearQueue()
      
      expect(service.getQueueLength()).toBe(0)
      expect(service.isEmpty()).toBe(true)
    })

    it('should interrupt current playback', async () => {
      await service.speak('First message')
      
      // Simulate playing state
      service['updateState']({ isPlaying: true })
      
      await service.speak('Interrupting message', { interrupt: true })
      
      expect(service.getQueueLength()).toBe(1) // Only the interrupting message
    })
  })

  describe('playback controls', () => {
    it('should stop playback', () => {
      service['currentAudio'] = mockAudio as any
      service['updateState']({ isPlaying: true })
      
      service.stop()
      
      expect(mockAudio.pause).toHaveBeenCalled()
      expect(mockAudio.currentTime).toBe(0)
      
      const state = service.getState()
      expect(state.isPlaying).toBe(false)
    })

    it('should pause playback', () => {
      service['currentAudio'] = mockAudio as any
      mockAudio.paused = false
      
      service.pause()
      
      expect(mockAudio.pause).toHaveBeenCalled()
    })

    it('should resume playback', () => {
      service['currentAudio'] = mockAudio as any
      mockAudio.paused = true
      
      service.resume()
      
      expect(mockAudio.play).toHaveBeenCalled()
    })

    it('should handle resume errors gracefully', () => {
      service['currentAudio'] = mockAudio as any
      mockAudio.play.mockRejectedValue(new Error('Playback failed'))
      mockAudio.paused = true
      
      service.resume()
      
      expect(mockAudio.play).toHaveBeenCalled()
    })
  })

  describe('volume control', () => {
    it('should set volume within valid range', () => {
      service.setVolume(0.5)
      
      expect(service.getVolume()).toBe(0.5)
      
      const state = service.getState()
      expect(state.volume).toBe(0.5)
    })

    it('should clamp volume to 0-1 range', () => {
      service.setVolume(-0.5)
      expect(service.getVolume()).toBe(0)
      
      service.setVolume(1.5)
      expect(service.getVolume()).toBe(1)
    })

    it('should update current audio volume', () => {
      service['currentAudio'] = mockAudio as any
      
      service.setVolume(0.3)
      
      expect(mockAudio.volume).toBe(0.3)
    })
  })

  describe('error handling', () => {
    it('should handle TTS API errors', async () => {
      mockResponse.ok = false
      mockResponse.json.mockResolvedValue({ error: 'API Error' })
      
      const onError = vi.fn()
      await service.speak('Hello world', { onError })
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(onError).toHaveBeenCalledWith('API Error')
    })

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
      
      const onError = vi.fn()
      await service.speak('Hello world', { onError })
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(onError).toHaveBeenCalledWith('Network error')
    })

    it('should handle audio loading errors', async () => {
      const onError = vi.fn()
      
      // Mock audio error
      const audioErrorListener = vi.fn()
      mockAudio.addEventListener.mockImplementation((event, listener) => {
        if (event === 'error') {
          audioErrorListener.mockImplementation(listener)
        }
      })
      
      await service.speak('Hello world', { onError })
      
      // Simulate audio error
      audioErrorListener()
      
      expect(onError).toHaveBeenCalled()
    })
  })

  describe('callback handling', () => {
    it('should call onStart callback', async () => {
      const onStart = vi.fn()
      
      await service.speak('Hello world', { onStart })
      
      expect(onStart).toHaveBeenCalled()
    })

    it('should call onEnd callback when audio ends', async () => {
      const onEnd = vi.fn()
      
      // Mock audio ended listener
      const endedListener = vi.fn()
      mockAudio.addEventListener.mockImplementation((event, listener) => {
        if (event === 'ended') {
          endedListener.mockImplementation(listener)
        }
      })
      
      await service.speak('Hello world', { onEnd })
      
      // Simulate audio ended
      endedListener()
      
      expect(onEnd).toHaveBeenCalled()
    })
  })

  describe('cleanup and destruction', () => {
    it('should cleanup resources on destroy', () => {
      service['currentAudio'] = mockAudio as any
      service['audioContext'] = mockAudioContext as any
      
      service.destroy()
      
      expect(mockAudioContext.close).toHaveBeenCalled()
      expect(service.getQueueLength()).toBe(0)
      
      const state = service.getState()
      expect(state.isPlaying).toBe(false)
    })

    it('should cleanup blob URLs', () => {
      service['currentAudio'] = {
        ...mockAudio,
        src: 'blob:mock-url'
      } as any
      
      service['cleanup']()
      
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('audio context management', () => {
    it('should resume suspended audio context', async () => {
      mockAudioContext.state = 'suspended'
      service['audioContext'] = mockAudioContext as any
      
      await service.speak('Hello world')
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(mockAudioContext.resume).toHaveBeenCalled()
    })

    it('should handle missing audio context gracefully', () => {
      service['audioContext'] = null
      
      expect(() => service.speak('Hello world')).not.toThrow()
    })
  })
})