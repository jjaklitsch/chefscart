import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { zipCode } = await request.json()

    // Validate ZIP code format (just 5 digits)
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({
        isValid: false,
        hasInstacartCoverage: false,
        message: 'Please enter a valid 5-digit ZIP code'
      }, { status: 400 })
    }

    const apiKey = process.env.INSTACART_API_KEY
    
    // If no API key, fall back to allowing all valid ZIP codes
    if (!apiKey) {
      console.warn('INSTACART_API_KEY not configured, allowing all ZIP codes')
      return NextResponse.json({
        isValid: true,
        hasInstacartCoverage: true,
        message: 'Great! ChefsCart is available in your area.'
      })
    }

    // Call Instacart API to check if retailers are available
    try {
      const instacartResponse = await fetch(
        `${process.env.INSTACART_IDP_BASE_URL}/idp/v1/retailers?postal_code=${zipCode}&country_code=US`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      )

      if (!instacartResponse.ok) {
        // If we get a 404, it means no coverage
        if (instacartResponse.status === 404) {
          return NextResponse.json({
            isValid: true,
            hasInstacartCoverage: false,
            message: 'ChefsCart isn\'t available in your area yet.'
          })
        }
        
        // For other errors, log but allow the user to proceed
        console.error('Instacart API error:', instacartResponse.status)
        return NextResponse.json({
          isValid: true,
          hasInstacartCoverage: true,
          message: 'Great! ChefsCart is available in your area.'
        })
      }

      const data = await instacartResponse.json()
      const hasRetailers = data.retailers && data.retailers.length > 0

      return NextResponse.json({
        isValid: true,
        hasInstacartCoverage: hasRetailers,
        message: hasRetailers 
          ? 'Great! ChefsCart is available in your area.'
          : 'ChefsCart isn\'t available in your area yet.',
        retailerCount: hasRetailers ? data.retailers.length : 0
      })

    } catch (apiError) {
      // If the API call fails, log the error but allow the user to proceed
      console.error('Error calling Instacart API:', apiError)
      return NextResponse.json({
        isValid: true,
        hasInstacartCoverage: true,
        message: 'Great! ChefsCart is available in your area.'
      })
    }

  } catch (error) {
    console.error('ZIP validation error:', error)
    return NextResponse.json({
      isValid: false,
      hasInstacartCoverage: false,
      message: 'Error validating ZIP code'
    }, { status: 500 })
  }
}