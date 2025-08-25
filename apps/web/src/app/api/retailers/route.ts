import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface InstacartRetailer {
  retailer_key: string
  name: string
  retailer_logo_url: string
}

interface InstacartRetailersResponse {
  retailers: InstacartRetailer[]
}

// Prioritize grocery stores based on common patterns in retailer names
const getRetailerPriority = (name: string): number => {
  const lowercaseName = name.toLowerCase()
  
  // Priority 0: Whole Foods first
  if (lowercaseName.includes('whole foods')) {
    return 0
  }
  
  // Priority 0.5: Largest chains by store count (excluding Walmart)
  if (lowercaseName.includes('aldi') ||
      lowercaseName.includes('albertsons') ||
      lowercaseName.includes('publix') ||
      lowercaseName.includes('kroger') ||
      lowercaseName.includes('food lion') ||
      lowercaseName.includes('safeway')) {
    return 0.5
  }
  
  // Priority 1: Premium and major grocery chains
  if (lowercaseName.includes('pavilions') ||
      lowercaseName.includes('gelson') ||
      lowercaseName.includes('erewhon') ||
      lowercaseName.includes('bristol farms') ||
      lowercaseName.includes('grocers') ||
      lowercaseName.includes('trader joe') ||
      lowercaseName.includes('wegmans') ||
      lowercaseName.includes('harris teeter') ||
      lowercaseName.includes('giant') ||
      lowercaseName.includes('stop & shop') ||
      lowercaseName.includes('vons') ||
      lowercaseName.includes('ralphs') ||
      lowercaseName.includes('meijer') ||
      lowercaseName.includes('h-e-b') ||
      lowercaseName.includes('hy-vee')) {
    return 1
  }
  
  // Priority 2: General grocery/market stores
  if (lowercaseName.includes('grocery') || 
      lowercaseName.includes('market') || 
      lowercaseName.includes('foods') ||
      lowercaseName.includes('supermarket')) {
    return 2
  }
  
  // Priority 3: Warehouse clubs
  if (lowercaseName.includes('costco') || 
      lowercaseName.includes('sam\'s club') ||
      lowercaseName.includes('bj\'s')) {
    return 3
  }
  
  // Priority 4: Target/Walmart
  if (lowercaseName.includes('target') || 
      lowercaseName.includes('walmart')) {
    return 4
  }
  
  // Priority 5: Convenience/Drug stores
  if (lowercaseName.includes('cvs') || 
      lowercaseName.includes('walgreens') ||
      lowercaseName.includes('rite aid') ||
      lowercaseName.includes('7-eleven') ||
      lowercaseName.includes('convenience')) {
    return 5
  }
  
  // Priority 6: Specialty stores
  if (lowercaseName.includes('wine') || 
      lowercaseName.includes('liquor') ||
      lowercaseName.includes('pet') ||
      lowercaseName.includes('office')) {
    return 6
  }
  
  // Default priority for unknown stores
  return 7
}

export async function POST(request: NextRequest) {
  try {
    const { zipCode } = await request.json()

    // Validate ZIP code format
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return NextResponse.json({
        success: false,
        message: 'Please enter a valid 5-digit ZIP code',
        retailers: []
      }, { status: 400 })
    }

    const apiKey = process.env.INSTACART_API_KEY
    
    if (!apiKey) {
      console.error('INSTACART_API_KEY not configured')
    }

    // Call Instacart API to get nearby retailers
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
      const errorText = await instacartResponse.text()
      console.error('Instacart API error:', instacartResponse.status, errorText)
      
      // Handle specific error cases
      if (instacartResponse.status === 401) {
        return NextResponse.json({
          success: false,
          message: 'Authentication error with Instacart API',
          retailers: []
        }, { status: 500 })
      }
      
      if (instacartResponse.status === 404) {
        return NextResponse.json({
          success: false,
          message: 'No retailers found in your area',
          retailers: []
        }, { status: 200 })
      }
      
      throw new Error(`Instacart API returned ${instacartResponse.status}`)
    }

    const data: InstacartRetailersResponse = await instacartResponse.json()
    
    // Check if we have retailers
    if (!data.retailers || data.retailers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'ChefsCart isn\'t available in your area yet',
        retailers: []
      }, { status: 200 })
    }

    // Sort retailers with grocery stores prioritized
    const sortedRetailers = [...data.retailers].sort((a, b) => {
      const priorityA = getRetailerPriority(a.name)
      const priorityB = getRetailerPriority(b.name)
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      
      // If same priority, sort alphabetically
      return a.name.localeCompare(b.name)
    })

    // Filter out categories 5+ if we have 3+ retailers from categories 1-4
    const topTierRetailers = sortedRetailers.filter(retailer => getRetailerPriority(retailer.name) <= 4)
    const finalRetailers = topTierRetailers.length >= 3 
      ? topTierRetailers 
      : sortedRetailers

    return NextResponse.json({
      success: true,
      retailers: finalRetailers,
      message: `Found ${finalRetailers.length} stores in your area`
    })

  } catch (error) {
    console.error('Error fetching retailers:', error)
    return NextResponse.json({
      success: false,
      message: 'Error checking store availability',
      retailers: []
    }, { status: 500 })
  }
}