import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const INSTACART_API_KEY = process.env.INSTACART_API_KEY
const INSTACART_BASE_URL = process.env.INSTACART_IDP_BASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export async function POST(request: NextRequest) {
  try {
    // Verify this is a Vercel cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🚀 Starting monthly Instacart ZIP code sync...')

    // Get a sample of ZIP codes to process (full implementation would process all)
    const { data: zipCodes, error } = await supabase
      .from('zip_code_cache')
      .select('zip_code')
      .order('last_updated', { ascending: true })
      .limit(100) // Process 100 at a time for demo

    if (error) {
      throw error
    }

    let processed = 0
    let updated = 0
    let errors = 0

    for (const { zip_code } of zipCodes || []) {
      try {
        // Call Instacart API (simplified)
        const response = await fetch(`${INSTACART_BASE_URL}/v2/fulfillment/store/delivery_zip_codes/validate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${INSTACART_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ zip_code })
        })

        const data = await response.json()
        const hasInstacartCoverage = response.ok && !data.no_coverage

        // Update cache
        await supabase
          .from('zip_code_cache')
          .upsert({
            zip_code,
            is_valid: response.ok,
            has_instacart_coverage: hasInstacartCoverage,
            last_updated: new Date().toISOString(),
            last_api_check: new Date().toISOString(),
            api_response_status: response.status
          })

        updated++

        // If this ZIP became newly available, notify waitlist
        if (hasInstacartCoverage) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notify-waitlist`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                zipCodes: [zip_code],
                apiKey: process.env.CRON_API_KEY
              })
            })
          } catch (notifyError) {
            console.warn(`Failed to notify waitlist for ${zip_code}:`, notifyError)
          }
        }

        processed++

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (zipError) {
        console.error(`Error processing ${zip_code}:`, zipError)
        errors++
      }
    }

    const result = {
      success: true,
      message: 'Sync completed',
      processed,
      updated,
      errors,
      timestamp: new Date().toISOString()
    }

    console.log('✅ Sync completed:', result)
    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Sync failed:', error)
    return NextResponse.json({
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}