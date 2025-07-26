import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Mock ZIP codes with Instacart coverage for demonstration
// In production, this would integrate with Instacart's coverage API
const INSTACART_COVERAGE_ZIPS = new Set([
  // New York
  '10001', '10002', '10003', '10004', '10005', '10010', '10011', '10012', '10013', '10014',
  // Los Angeles / Beverly Hills
  '90210', '90211', '90212', '90213', '90214', '90215', '90220', '90221', '90222', '90223',
  // San Francisco
  '94102', '94103', '94104', '94105', '94106', '94107', '94108', '94109', '94110', '94111',
  // Chicago
  '60601', '60602', '60603', '60604', '60605', '60606', '60607', '60608', '60609', '60610',
  // Boston
  '02101', '02102', '02103', '02104', '02105', '02106', '02107', '02108', '02109', '02110',
  // Dallas
  '75201', '75202', '75203', '75204', '75205', '75206', '75207', '75208', '75209', '75210',
  // Miami
  '33101', '33102', '33103', '33104', '33105', '33106', '33107', '33108', '33109', '33110',
  // Seattle
  '98101', '98102', '98103', '98104', '98105', '98106', '98107', '98108', '98109', '98110',
  // Atlanta
  '30301', '30302', '30303', '30304', '30305', '30306', '30307', '30308', '30309', '30310',
  // Phoenix
  '85001', '85002', '85003', '85004', '85005', '85006', '85007', '85008', '85009', '85010',
  // Test ZIP codes for development
  '12345', '54321',
])

interface USPSCityStateResponse {
  zip5: string
  city: string
  state: string
}

async function validateZipWithUSPS(zipCode: string): Promise<USPSCityStateResponse | null> {
  try {
    const uspsApiKey = process.env.USPS_API_KEY
    if (!uspsApiKey) {
      console.warn('USPS API key not configured, falling back to format validation only')
      return null
    }

    const apiUrl = `https://secure.shippingapis.com/ShippingAPI.dll?API=CityStateLookup&XML=<CityStateLookupRequest USERID="${uspsApiKey}"><ZipCode ID="0"><Zip5>${zipCode}</Zip5></ZipCode></CityStateLookupRequest>`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'ChefsCart/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`USPS API returned ${response.status}`)
    }

    const xmlText = await response.text()
    
    // Check for error in response
    if (xmlText.includes('<Error>') || xmlText.includes('Invalid Zip Code')) {
      return null
    }

    // Simple XML parsing (in production, use a proper XML parser)
    const zip5Match = xmlText.match(/<Zip5>([^<]+)<\/Zip5>/)
    const cityMatch = xmlText.match(/<City>([^<]+)<\/City>/)
    const stateMatch = xmlText.match(/<State>([^<]+)<\/State>/)

    if (zip5Match && cityMatch && stateMatch && zip5Match[1] && cityMatch[1] && stateMatch[1]) {
      return {
        zip5: zip5Match[1],
        city: cityMatch[1],
        state: stateMatch[1],
      }
    }

    return null
  } catch (error) {
    console.error('USPS validation error:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { zipCode } = await request.json()

    // Validate ZIP code format
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({
        isValid: false,
        hasInstacartCoverage: false,
        message: 'Invalid ZIP code format'
      }, { status: 400 })
    }

    // Validate ZIP code with USPS
    const uspsData = await validateZipWithUSPS(zipCode)
    
    // In development or when USPS fails, use mock data for supported ZIPs
    if (!uspsData) {
      // Check if it's in our supported list for development
      const hasInstacartCoverage = INSTACART_COVERAGE_ZIPS.has(zipCode)
      
      if (hasInstacartCoverage || process.env.NODE_ENV === 'development') {
        // Mock city/state data for known ZIPs
        const mockCityState: Record<string, { city: string; state: string }> = {
          '10001': { city: 'New York', state: 'NY' },
          '90210': { city: 'Beverly Hills', state: 'CA' },
          '94102': { city: 'San Francisco', state: 'CA' },
          '60601': { city: 'Chicago', state: 'IL' },
          '02101': { city: 'Boston', state: 'MA' },
          '12345': { city: 'Schenectady', state: 'NY' },
          '54321': { city: 'Madison', state: 'WI' },
        }
        
        const mockData = mockCityState[zipCode] || { city: 'Unknown City', state: 'Unknown State' }
        
        return NextResponse.json({
          isValid: true,
          hasInstacartCoverage,
          city: mockData.city,
          state: mockData.state,
          message: hasInstacartCoverage 
            ? 'Instacart delivers to this area'
            : 'Instacart does not deliver to this area yet'
        })
      }
      
      return NextResponse.json({
        isValid: false,
        hasInstacartCoverage: false,
        message: 'Invalid ZIP code'
      }, { status: 400 })
    }

    // Check if ZIP code has Instacart coverage
    const hasInstacartCoverage = INSTACART_COVERAGE_ZIPS.has(zipCode)

    return NextResponse.json({
      isValid: true,
      hasInstacartCoverage,
      city: uspsData.city,
      state: uspsData.state,
      message: hasInstacartCoverage 
        ? 'Instacart delivers to this area'
        : 'Instacart does not deliver to this area yet'
    })

  } catch (error) {
    console.error('ZIP validation error:', error)
    return NextResponse.json({
      isValid: false,
      hasInstacartCoverage: false,
      message: 'Error validating ZIP code'
    }, { status: 500 })
  }
}