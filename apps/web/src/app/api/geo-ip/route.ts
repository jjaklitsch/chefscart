import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get client IP from headers
    const forwarded = request.headers.get('x-forwarded-for')
    const clientIP = forwarded?.split(',')[0] || request.headers.get('x-real-ip') || '127.0.0.1'
    
    // For development/local testing, return null data
    if (clientIP === '127.0.0.1' || clientIP === '::1' || clientIP.startsWith('192.168.') || clientIP.startsWith('10.') || clientIP.startsWith('172.')) {
      return NextResponse.json({
        success: true,
        data: {
          zipCode: null,
          city: null,
          state: null,
          country: null,
          isUS: true // Assume local development is US for testing
        },
        message: 'Local IP detected, no geolocation available'
      })
    }

    // Try to get location from IP using ip-api.com (free tier)
    const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,zip,city,regionName,country,message`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch geo IP data')
    }
    
    const data = await response.json()
    
    if (data.status === 'success') {
      return NextResponse.json({
        success: true,
        data: {
          zipCode: data.zip || null,
          city: data.city || null,
          state: data.regionName || null,
          country: data.country || null,
          isUS: data.country === 'United States'
        }
      })
    } else {
      return NextResponse.json({
        success: true,
        data: {
          zipCode: null,
          city: null,
          state: null,
          country: null,
          isUS: false
        },
        message: data.message || 'Failed to get location data'
      })
    }

  } catch (error) {
    console.error('Geo IP lookup error:', error)
    return NextResponse.json({
      success: false,
      data: {
        zipCode: null,
        city: null,
        state: null,
        country: null,
        isUS: false
      },
      error: 'Failed to determine location from IP'
    }, { status: 500 })
  }
}