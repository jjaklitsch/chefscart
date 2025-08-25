import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Only enable this in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  return NextResponse.json({
    hasInstacartApiKey: !!process.env.INSTACART_API_KEY,
    instacartApiKeyLength: process.env.INSTACART_API_KEY?.length || 0,
    instacartApiKeyPrefix: process.env.INSTACART_API_KEY?.substring(0, 10) || 'not found',
    instacartIdpBaseUrl: process.env.INSTACART_IDP_BASE_URL,
    nodeEnv: process.env.NODE_ENV,
    availableEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('INSTACART') || key.includes('OPENAI') || key.includes('FIREBASE')
    ).sort()
  })
}