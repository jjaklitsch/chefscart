import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface GeoIPResponse {
  zipCode: string | null
  city: string | null
  state: string | null
}

interface IPAPIResponse {
  status: string
  zip?: string
  city?: string
  region?: string
  country?: string
  message?: string
}

async function getLocationFromIPAPI(ip: string): Promise<GeoIPResponse> {
  try {
    const apiKey = process.env.IPAPI_KEY
    const apiUrl = apiKey 
      ? `https://ipapi.co/${ip}/json/?key=${apiKey}`
      : `https://ipapi.co/${ip}/json/`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ChefsCart/1.0',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`IP API returned ${response.status}`)
    }

    const data: IPAPIResponse = await response.json()

    if (data.status === 'success' && data.zip) {
      return {
        zipCode: data.zip,
        city: data.city || null,
        state: data.region || null,
      }
    }

    return {
      zipCode: null,
      city: null,
      state: null,
    }
  } catch (error) {
    console.error('IP API lookup failed:', error)
    return {
      zipCode: null,
      city: null,
      state: null,
    }
  }
}

async function getLocationFromFallbackAPI(ip: string): Promise<GeoIPResponse> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`http://ip-api.com/json/${ip}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ChefsCart/1.0',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Fallback API returned ${response.status}`)
    }

    const data = await response.json()

    if (data.status === 'success' && data.zip) {
      return {
        zipCode: data.zip,
        city: data.city || null,
        state: data.region || null,
      }
    }

    return {
      zipCode: null,
      city: null,
      state: null,
    }
  } catch (error) {
    console.error('Fallback API lookup failed:', error)
    return {
      zipCode: null,
      city: null,
      state: null,
    }
  }
}

function isPrivateIP(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.') ||
    ip === '::1' ||
    ip.startsWith('fc00:') ||
    ip.startsWith('fe80:')
  )
}

function extractClientIP(request: NextRequest): string {
  // Try various headers to get the real client IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded', 
    'forwarded-for',
    'forwarded'
  ]

  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // Take the first IP from comma-separated list
      const ip = value.split(',')[0].trim()
      if (ip && !isPrivateIP(ip)) {
        return ip
      }
    }
  }

  // Fallback to localhost
  return '127.0.0.1'
}

export async function GET(request: NextRequest) {
  try {
    const ip = extractClientIP(request)

    // For development/localhost, return default NYC location
    if (isPrivateIP(ip)) {
      return NextResponse.json({
        zipCode: '10001',
        city: 'New York',
        state: 'NY'
      })
    }

    // Try primary IP geolocation service
    let location = await getLocationFromIPAPI(ip)

    // If primary service failed, try fallback
    if (!location.zipCode) {
      location = await getLocationFromFallbackAPI(ip)
    }

    // Return result (may be null if all services failed)
    return NextResponse.json(location)

  } catch (error) {
    console.error('Geo-IP error:', error)
    return NextResponse.json({
      zipCode: null,
      city: null,
      state: null
    }, { status: 500 })
  }
}