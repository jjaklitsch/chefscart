import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VoiceInput from '../../../components/VoiceInput'

// Mock the voice recording service
const mockVoiceService = {
  onStateChange: vi.fn(() => vi.fn()), // Returns unsubscribe function
  onPermissionChange: vi.fn(() => vi.fn()),
  requestPermission: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  getState: vi.fn(() => ({
    isRecording: false,
    isInitialized: false,
    audioLevel: 0,
    duration: 0
  })),
  getPermissionState: vi.fn(() => ({
    hasPermission: false,
    isRequesting: false
  })),
  cleanup: vi.fn()
}

vi.mock('../../../lib/voice-recording', () => ({
  getVoiceRecordingService: () => mockVoiceService
}))

// Mock fetch
global.fetch = vi.fn()

describe('VoiceInput', () => {
  const mockOnTranscription = vi.fn()
  const mockOnError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock service state
    mockVoiceService.getState.mockReturnValue({
      isRecording: false,
      isInitialized: false,
      audioLevel: 0,
      duration: 0
    })
    
    mockVoiceService.getPermissionState.mockReturnValue({
      hasPermission: false,
      isRequesting: false
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('permission handling', () => {
    it('should render permission request button when permission not granted', () => {
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      const button = screen.getByRole('button', { name: /request microphone permission/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('title', 'Click to enable voice input')
    })

    it('should request permission when button is clicked', async () => {
      const user = userEvent.setup()
      mockVoiceService.requestPermission.mockResolvedValue(true)
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      const button = screen.getByRole('button', { name: /request microphone permission/i })
      await user.click(button)
      
      expect(mockVoiceService.requestPermission).toHaveBeenCalled()
    })

    it('should show loading state when requesting permission', () => {
      mockVoiceService.getPermissionState.mockReturnValue({
        hasPermission: false,
        isRequesting: true
      })
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      const button = screen.getByRole('button', { name: /requesting microphone permission/i })
      expect(button).toBeInTheDocument()
      expect(button).toBeDisabled()
    })

    it('should handle permission denial', async () => {
      const user = userEvent.setup()
      mockVoiceService.requestPermission.mockResolvedValue(false)
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      const button = screen.getByRole('button', { name: /request microphone permission/i })
      await user.click(button)
      
      expect(mockOnError).toHaveBeenCalledWith(
        'Microphone permission is required for voice input'
      )
    })
  })

  describe('recording functionality', () => {
    beforeEach(() => {
      // Mock permission granted
      mockVoiceService.getPermissionState.mockReturnValue({
        hasPermission: true,
        isRequesting: false
      })
    })

    it('should render recording button when permission is granted', () => {
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      const button = screen.getByRole('button', { name: /start voice recording/i })
      expect(button).toBeInTheDocument()
    })

    it('should start recording when button is clicked', async () => {
      const user = userEvent.setup()
      mockVoiceService.startRecording.mockResolvedValue(true)
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      const button = screen.getByRole('button', { name: /start voice recording/i })
      await user.click(button)
      
      expect(mockVoiceService.startRecording).toHaveBeenCalled()
    })

    it('should stop recording when clicked during recording', async () => {
      const user = userEvent.setup()
      
      // Mock recording state
      mockVoiceService.getState.mockReturnValue({
        isRecording: true,
        isInitialized: true,
        audioLevel: 50,
        duration: 5
      })
      
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
      mockVoiceService.stopRecording.mockReturnValue(mockBlob)
      
      // Mock successful transcription
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ text: 'Hello world' })
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      const button = screen.getByRole('button', { name: /stop recording/i })
      await user.click(button)
      
      expect(mockVoiceService.stopRecording).toHaveBeenCalled()
    })

    it('should handle recording failure', async () => {
      const user = userEvent.setup()
      mockVoiceService.startRecording.mockResolvedValue(false)
      mockVoiceService.getState.mockReturnValue({
        isRecording: false,
        isInitialized: false,
        audioLevel: 0,
        duration: 0,
        error: 'Recording failed'
      })
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      const button = screen.getByRole('button', { name: /start voice recording/i })
      await user.click(button)
      
      expect(mockOnError).toHaveBeenCalledWith('Recording failed')
    })
  })

  describe('transcription handling', () => {
    beforeEach(() => {
      mockVoiceService.getPermissionState.mockReturnValue({
        hasPermission: true,
        isRequesting: false
      })
    })

    it('should transcribe audio and call onTranscription', async () => {
      const user = userEvent.setup()
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
      mockVoiceService.stopRecording.mockReturnValue(mockBlob)
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ text: 'Hello world' })
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      // Simulate recording and stopping
      mockVoiceService.getState.mockReturnValue({
        isRecording: true,
        isInitialized: true,
        audioLevel: 50,
        duration: 5
      })
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/voice/transcribe', {
          method: 'POST',
          body: expect.any(FormData)
        })
      })
      
      await waitFor(() => {
        expect(mockOnTranscription).toHaveBeenCalledWith('Hello world')
      })
    })

    it('should handle empty transcription', async () => {
      const user = userEvent.setup()
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
      mockVoiceService.stopRecording.mockReturnValue(mockBlob)
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ text: '' })
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      // Simulate stopping recording
      const button = screen.getByRole('button')
      await user.click(button)
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          'No speech detected. Please try speaking more clearly.'
        )
      })
    })

    it('should handle transcription API errors', async () => {
      const user = userEvent.setup()
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
      mockVoiceService.stopRecording.mockReturnValue(mockBlob)
      
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'API Error' })
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('API Error')
      })
    })

    it('should handle network errors', async () => {
      const user = userEvent.setup()
      const mockBlob = new Blob(['audio data'], { type: 'audio/webm' })
      mockVoiceService.stopRecording.mockReturnValue(mockBlob)
      
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Network error')
      })
    })

    it('should handle missing audio blob', async () => {
      const user = userEvent.setup()
      mockVoiceService.stopRecording.mockReturnValue(null)
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(mockOnError).toHaveBeenCalledWith('No audio data recorded')
    })
  })

  describe('visual feedback', () => {
    beforeEach(() => {
      mockVoiceService.getPermissionState.mockReturnValue({
        hasPermission: true,
        isRequesting: false
      })
    })

    it('should show recording duration during recording', () => {
      mockVoiceService.getState.mockReturnValue({
        isRecording: true,
        isInitialized: true,
        audioLevel: 50,
        duration: 65 // 1 minute 5 seconds
      })
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
          showVisualFeedback={true}
        />
      )
      
      expect(screen.getByText('1:05')).toBeInTheDocument()
    })

    it('should show audio level indicators during recording', () => {
      mockVoiceService.getState.mockReturnValue({
        isRecording: true,
        isInitialized: true,
        audioLevel: 80,
        duration: 5
      })
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
          showVisualFeedback={true}
        />
      )
      
      // Should have audio level indicators
      const levelIndicators = screen.getByRole('button').parentElement?.querySelectorAll('[class*="bg-red-500"]')
      expect(levelIndicators?.length).toBeGreaterThan(0)
    })

    it('should hide visual feedback when showVisualFeedback is false', () => {
      mockVoiceService.getState.mockReturnValue({
        isRecording: true,
        isInitialized: true,
        audioLevel: 50,
        duration: 5
      })
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
          showVisualFeedback={false}
        />
      )
      
      expect(screen.queryByText('0:05')).not.toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('should disable button when disabled prop is true', () => {
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
          disabled={true}
        />
      )
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('should not start recording when disabled', async () => {
      const user = userEvent.setup()
      
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
          disabled={true}
        />
      )
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(mockVoiceService.startRecording).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should cleanup voice service on unmount', () => {
      const { unmount } = render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      unmount()
      
      expect(mockVoiceService.cleanup).toHaveBeenCalled()
    })
  })

  describe('state management', () => {
    it('should subscribe to voice service state changes', () => {
      render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      expect(mockVoiceService.onStateChange).toHaveBeenCalled()
      expect(mockVoiceService.onPermissionChange).toHaveBeenCalled()
    })

    it('should unsubscribe from voice service on unmount', () => {
      const mockUnsubscribe = vi.fn()
      mockVoiceService.onStateChange.mockReturnValue(mockUnsubscribe)
      mockVoiceService.onPermissionChange.mockReturnValue(mockUnsubscribe)
      
      const { unmount } = render(
        <VoiceInput 
          onTranscription={mockOnTranscription} 
          onError={mockOnError}
        />
      )
      
      unmount()
      
      expect(mockUnsubscribe).toHaveBeenCalledTimes(2)
    })
  })
})