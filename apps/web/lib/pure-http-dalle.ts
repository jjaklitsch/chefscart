import https from 'https'

// Pure HTTP DALL-E API call with retry logic
export async function generateImageHTTP(
  prompt: string,
  size: '256x256' | '512x512' | '1024x1024' = '512x512',
  maxRetries: number = 2
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        const postData = JSON.stringify({
          model: 'dall-e-2',
          prompt,
          n: 1,
          size
        })

        const options = {
          hostname: 'api.openai.com',
          port: 443,
          path: '/v1/images/generations',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Connection': 'close'
          },
          timeout: 60000 // DALL-E needs more time than text generation
        }

        const req = https.request(options, (res) => {
          let data = ''
          res.on('data', (chunk) => { data += chunk })
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data)
              
              if (parsed.error) {
                reject(new Error(`DALL-E API error: ${parsed.error.message || 'Unknown error'}`))
                return
              }
              
              resolve(parsed)
            } catch (e) {
              reject(new Error(`JSON parse error: ${e instanceof Error ? e.message : e}`))
            }
          })
        })

        req.on('error', reject)
        req.on('timeout', () => {
          req.destroy()
          reject(new Error('DALL-E request timeout'))
        })
        
        req.setTimeout(60000) // 60s timeout for image generation
        req.write(postData)
        req.end()
      })
      
      const imageUrl = result.data?.[0]?.url
      if (!imageUrl) {
        throw new Error('No image URL returned from DALL-E')
      }
      
      return imageUrl
      
    } catch (error) {
      const isLastAttempt = attempt === maxRetries
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      console.log(`DALL-E request attempt ${attempt + 1}/${maxRetries + 1} failed: ${errorMessage}`)
      
      if (isLastAttempt) {
        throw error
      }
      
      // Retry with longer backoff for image generation
      const backoffMs = Math.min(2000 * Math.pow(2, attempt), 10000)
      await new Promise(resolve => setTimeout(resolve, backoffMs))
    }
  }
  
  throw new Error('All DALL-E retry attempts failed')
}