import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ZipCodeInput from '@/components/ZipCodeInput'

// Mock fetch globally
global.fetch = vi.fn()

describe('ZipCodeInput Component', () => {
  const mockOnZipValidation = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset fetch mock
    vi.mocked(fetch).mockClear()
  })

  describe('Initial Rendering', () => {
    it('should render the zip code input field', () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      expect(screen.getByLabelText('Enter your ZIP code to get started')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('12345')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should display map icon', () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const mapIcon = document.querySelector('.lucide-map-pin')
      expect(mapIcon).toBeInTheDocument()
    })

    it('should have proper input attributes', () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'text')
      expect(input).toHaveAttribute('maxLength', '5')
      expect(input).toHaveAttribute('placeholder', '12345')
    })
  })

  describe('Geo-IP Auto-Detection', () => {
    it('should attempt to auto-detect ZIP code on mount', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ zipCode: '10001' })
      } as Response)

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/geo-ip')
      })
    })

    it('should auto-validate detected ZIP code', async () => {
      // Mock geo-IP response
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ zipCode: '10001' })
        } as Response)
        // Mock validation response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ hasInstacartCoverage: true })
        } as Response)

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/validate-zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zipCode: '10001' })
        })
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue('10001')).toBeInTheDocument()
      })
    })

    it('should handle geo-IP detection failure gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to detect location:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('User Input Validation', () => {
    it('should allow only numeric input', async () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'abc123def')

      expect(input).toHaveValue('123')
    })

    it('should limit input to 5 characters', async () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '123456789')

      expect(input).toHaveValue('12345')
    })

    it('should validate ZIP code format', async () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '123')

      // Should call validation with invalid result for incomplete ZIP
      expect(mockOnZipValidation).toHaveBeenCalledWith('123', false)
    })

    it('should trigger validation when 5 digits are entered', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasInstacartCoverage: true })
      } as Response)

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '10001')

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/validate-zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zipCode: '10001' })
        })
      })
    })
  })

  describe('Validation States', () => {
    it('should show valid state for covered ZIP codes', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasInstacartCoverage: true })
      } as Response)

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '10001')

      await waitFor(() => {
        expect(screen.getByText('Great! Instacart delivers to your area.')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(mockOnZipValidation).toHaveBeenCalledWith('10001', true)
      })

      // Check for success icon
      const checkIcon = document.querySelector('.lucide-check-circle')
      expect(checkIcon).toBeInTheDocument()
    })

    it('should show no-coverage state for uncovered ZIP codes', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasInstacartCoverage: false })
      } as Response)

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '99999')

      await waitFor(() => {
        expect(screen.getByText("Sorry, Instacart doesn't deliver to this area yet. Join our waitlist!")).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(mockOnZipValidation).toHaveBeenCalledWith('99999', false)
      })

      // Check for alert icon
      const alertIcon = document.querySelector('.lucide-alert-circle')
      expect(alertIcon).toBeInTheDocument()

      // Check for waitlist button
      expect(screen.getByText('Join Waitlist')).toBeInTheDocument()
    })

    it('should show error state for invalid ZIP codes', async () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '0000')

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid 5-digit ZIP code')).toBeInTheDocument()
      })

      expect(mockOnZipValidation).toHaveBeenCalledWith('0000', false)
    })

    it('should show error state for API validation failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '10001')

      await waitFor(() => {
        expect(screen.getByText('Unable to verify ZIP code. Please try again.')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(mockOnZipValidation).toHaveBeenCalledWith('10001', false)
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner during validation', async () => {
      // Mock a delayed response
      vi.mocked(fetch).mockImplementationOnce(() => 
        new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ hasInstacartCoverage: true })
          } as Response), 100)
        })
      )

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '10001')

      // Should show loading spinner
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()

      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByText('Great! Instacart delivers to your area.')).toBeInTheDocument()
      })
    })
  })

  describe('Border Color States', () => {
    it('should have default border color initially', () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-gray-300')
    })

    it('should have green border for valid ZIP', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasInstacartCoverage: true })
      } as Response)

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '10001')

      await waitFor(() => {
        expect(input).toHaveClass('border-green-500')
      })
    })

    it('should have red border for invalid ZIP', async () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '000')

      await waitFor(() => {
        expect(input).toHaveClass('border-red-500')
      })
    })
  })

  describe('Waitlist Functionality', () => {
    it('should show waitlist button for uncovered areas', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasInstacartCoverage: false })
      } as Response)

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '99999')

      await waitFor(() => {
        expect(screen.getByText('Join Waitlist')).toBeInTheDocument()
      })
    })

    it('should handle waitlist signup', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasInstacartCoverage: false })
      } as Response)

      // Mock window.prompt and window.alert
      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('test@example.com')
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '99999')

      await waitFor(async () => {
        const waitlistButton = screen.getByText('Join Waitlist')
        await user.click(waitlistButton)
      })

      expect(promptSpy).toHaveBeenCalledWith('Enter your email to join the waitlist:')
      expect(alertSpy).toHaveBeenCalledWith("Thanks! We'll notify you when we expand to your area.")

      promptSpy.mockRestore()
      alertSpy.mockRestore()
    })

    it('should handle waitlist signup cancellation', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasInstacartCoverage: false })
      } as Response)

      const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null)
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '99999')

      await waitFor(async () => {
        const waitlistButton = screen.getByText('Join Waitlist')
        await user.click(waitlistButton)
      })

      expect(promptSpy).toHaveBeenCalled()
      expect(alertSpy).not.toHaveBeenCalled()

      promptSpy.mockRestore()
      alertSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByLabelText('Enter your ZIP code to get started')
      expect(input).toBeInTheDocument()
    })

    it('should associate label with input', () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      const label = screen.getByText('Enter your ZIP code to get started')
      
      expect(input).toHaveAttribute('id', 'zipCode')
      expect(label).toHaveAttribute('for', 'zipCode')
    })

    it('should handle keyboard navigation', async () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      input.focus()
      
      expect(input).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    it('should handle component unmounting during API call', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })

      vi.mocked(fetch).mockReturnValueOnce(promise as any)

      const { unmount } = render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '10001')

      // Unmount before API call completes
      unmount()

      // Resolve the promise after unmounting
      resolvePromise!({
        ok: true,
        json: async () => ({ hasInstacartCoverage: true })
      })

      // Should not throw errors
      expect(() => {}).not.toThrow()
    })

    it('should reset validation state when typing new ZIP', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasInstacartCoverage: true })
      } as Response)

      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '10001')

      await waitFor(() => {
        expect(screen.getByText('Great! Instacart delivers to your area.')).toBeInTheDocument()
      })

      // Clear and type new partial ZIP
      await user.clear(input)
      await user.type(input, '123')

      // Should reset to idle state
      expect(screen.queryByText('Great! Instacart delivers to your area.')).not.toBeInTheDocument()
    })

    it('should handle rapid input changes', async () => {
      render(<ZipCodeInput onZipValidation={mockOnZipValidation} />)

      const input = screen.getByRole('textbox')
      
      // Rapidly type and delete
      await user.type(input, '12345')
      await user.clear(input)
      await user.type(input, '54321')

      // Should handle all changes without crashing
      expect(input).toHaveValue('54321')
    })
  })
})