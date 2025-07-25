import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get IP address from request headers
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1'

    // For development/demo purposes, return a mock ZIP code
    // In production, you would use a service like ipapi.co or ipgeolocation.io
    if (ip === '127.0.0.1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
      return NextResponse.json({
        zipCode: '10001', // Default to NYC for localhost
        city: 'New York',
        state: 'NY'
      })
    }

    // Mock geo-IP lookup - replace with actual service in production
    try {
      const geoResponse = await fetch(`http://ip-api.com/json/${ip}`)
      const geoData = await geoResponse.json()
      
      if (geoData.status === 'success' && geoData.zip) {
        return NextResponse.json({
          zipCode: geoData.zip,
          city: geoData.city,
          state: geoData.region
        })
      }
    } catch (geoError) {
      console.error('Geo-IP lookup failed:', geoError)
    }

    // Fallback to default
    return NextResponse.json({
      zipCode: null,
      city: null,
      state: null
    })

  } catch (error) {
    console.error('Geo-IP error:', error)
    return NextResponse.json({
      zipCode: null,
      city: null,
      state: null
    }, { status: 500 })
  }
}