import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Mock ZIP codes with Instacart coverage for demonstration
// Later we'll integrate with Instacart's delivery API
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

    // Check if ZIP code has Instacart coverage (mock for now)
    const hasInstacartCoverage = INSTACART_COVERAGE_ZIPS.has(zipCode)

    return NextResponse.json({
      isValid: true,
      hasInstacartCoverage,
      message: hasInstacartCoverage 
        ? 'Great! ChefsCart is available in your area.'
        : 'ChefsCart isn\'t available in your area yet.'
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