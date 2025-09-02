import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkCoverage() {
  try {
    // Get total count
    const { count: totalCount, error: totalError } = await supabase
      .from('zip_code_cache')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      console.error('Error getting total count:', totalError)
      return
    }

    // Get coverage count
    const { count: coverageCount, error: coverageError } = await supabase
      .from('zip_code_cache')
      .select('*', { count: 'exact', head: true })
      .eq('has_instacart_coverage', true)

    if (coverageError) {
      console.error('Error getting coverage count:', coverageError)
      return
    }

    // Get ZIP range
    const { data: rangeData, error: rangeError } = await supabase
      .from('zip_code_cache')
      .select('zip_code')
      .order('zip_code', { ascending: true })
      .limit(1)
      .single()

    const { data: maxRangeData, error: maxRangeError } = await supabase
      .from('zip_code_cache')
      .select('zip_code')
      .order('zip_code', { ascending: false })
      .limit(1)
      .single()

    const minZip = rangeData?.zip_code
    const maxZip = maxRangeData?.zip_code

    console.log('📊 ZIP Code Database Coverage Report')
    console.log('=' .repeat(40))
    console.log(`Total ZIP codes in database: ${totalCount?.toLocaleString()}`)
    console.log(`ZIP codes with Instacart coverage: ${coverageCount?.toLocaleString()}`)
    console.log(`Coverage percentage: ${totalCount ? ((coverageCount / totalCount) * 100).toFixed(2) : 0}%`)
    console.log(`ZIP code range: ${minZip} - ${maxZip}`)
    console.log()
    
    // For comparison, show expected US ZIP count
    console.log('📋 Expected Coverage:')
    console.log('Total US ZIP codes (estimated): ~41,000-42,000')
    console.log('Our coverage gap:', (41000 - (totalCount || 0)).toLocaleString())

  } catch (error) {
    console.error('Database error:', error)
  }
}

checkCoverage()