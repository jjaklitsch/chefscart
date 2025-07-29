// DALLE API Rate Limiter for Paid Tier
// OpenAI paid tier limits: 50-500+ images/min depending on usage tier
// Using 50 images/minute as a safe baseline for paid accounts
// Burst capacity of 15 allows generating ~10-15 meal images quickly

interface RateLimitRequest {
  id: string
  timestamp: number
  resolve: (url: string) => void
  reject: (error: Error) => void
  prompt: string
  size: string
}

class DalleRateLimiter {
  private queue: RateLimitRequest[] = []
  private processing = false
  // Paid tier limits: Reports indicate 50-500+ images/minute depending on tier
  // Using 50 images/minute as a safe paid tier limit
  private readonly maxRequestsPerMinute = 50 // Paid tier limit
  private readonly maxBurstRequests = 15 // Allow larger bursts for meal plan generation
  private requestTimestamps: number[] = []

  async generateImage(prompt: string, size: string = '512x512'): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const requestId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      this.queue.push({
        id: requestId,
        timestamp: Date.now(),
        resolve,
        reject,
        prompt,
        size
      })

      console.log(`🎨 DALLE request queued: ${requestId} (queue size: ${this.queue.length})`)
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      // Clean old timestamps (older than 1 minute)
      const oneMinuteAgo = Date.now() - 60000
      this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo)

      // Check if we can make a request
      const canProceed = this.canMakeRequest()
      
      if (!canProceed) {
        const nextAvailableTime = this.getNextAvailableTime()
        const waitTime = Math.max(0, nextAvailableTime - Date.now())
        
        console.log(`⏳ DALLE rate limit: waiting ${waitTime}ms before next request`)
        await this.sleep(waitTime)
        continue
      }

      const request = this.queue.shift()!
      this.requestTimestamps.push(Date.now())

      try {
        console.log(`🎨 Processing DALLE request: ${request.id}`)
        const imageUrl = await this.makeActualRequest(request.prompt, request.size)
        request.resolve(imageUrl)
        console.log(`✅ DALLE request completed: ${request.id}`)
      } catch (error) {
        console.error(`❌ DALLE request failed: ${request.id}`, error)
        request.reject(error instanceof Error ? error : new Error('Image generation failed'))
      }

      // Minimal delay between requests for paid tier
      await this.sleep(50) // 50ms allows up to 20 requests/second theoretical max
    }

    this.processing = false
  }

  private canMakeRequest(): boolean {
    const oneMinuteAgo = Date.now() - 60000
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneMinuteAgo)
    
    // Allow burst requests up to maxBurstRequests
    if (recentRequests.length < this.maxBurstRequests) {
      return true
    }

    // Otherwise check per-minute limit
    return recentRequests.length < this.maxRequestsPerMinute
  }

  private getNextAvailableTime(): number {
    if (this.requestTimestamps.length === 0) {
      return Date.now()
    }

    // Find the oldest request that would allow us to proceed
    const oneMinuteAgo = Date.now() - 60000
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneMinuteAgo)
    
    if (recentRequests.length < this.maxRequestsPerMinute) {
      return Date.now()
    }

    // We need to wait until the oldest request is > 1 minute old
    const oldestRequest = Math.min(...recentRequests)
    return oldestRequest + 60000 + 100 // Add small buffer
  }

  private async makeActualRequest(prompt: string, size: string): Promise<string> {
    // Use standard fetch instead of manual HTTPS for better reliability
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-2',
          prompt,
          n: 1,
          size
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`DALL-E API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(`DALL-E API error: ${data.error.message || 'Unknown error'}`)
      }
      
      const imageUrl = data.data?.[0]?.url
      if (!imageUrl) {
        throw new Error('No image URL returned from DALL-E')
      }
      
      return imageUrl
    } catch (error) {
      console.error('DALL-E request failed:', error)
      throw error
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Get queue status for debugging
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      recentRequests: this.requestTimestamps.filter(ts => ts > Date.now() - 60000).length,
      rateLimitInfo: {
        maxPerMinute: this.maxRequestsPerMinute,
        maxBurst: this.maxBurstRequests
      }
    }
  }
}

// Singleton instance
export const dalleRateLimiter = new DalleRateLimiter()