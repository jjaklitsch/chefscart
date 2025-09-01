import { NextRequest, NextResponse } from 'next/server'
import { isShoppingCartEnabled } from '../../../../lib/feature-flags'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      enableShoppingCart: isShoppingCartEnabled(),
    })
  } catch (error) {
    console.error('Error getting feature flags:', error)
    return NextResponse.json({
      enableShoppingCart: false, // default to false if error
    }, { status: 200 }) // Still return 200 to avoid breaking the UI
  }
}