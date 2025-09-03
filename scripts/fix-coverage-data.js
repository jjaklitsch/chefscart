import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Reset coverage data and re-check with correct logic
async function fixCoverageData() {
  console.log('🔧 Fixing incorrect coverage data...')
  
  // Reset all coverage to false and clear API status
  console.log('🗑️  Resetting all coverage data to false...')
  const { error: resetError } = await supabase
    .from('zip_code_cache')
    .update({
      has_instacart_coverage: false,
      api_response_status: null,
      last_api_check: new Date().toISOString()
    })
    .neq('zip_code', 'dummy_never_matches') // Update all records
  
  if (resetError) {
    console.error('Error resetting data:', resetError)
    return
  }
  
  // Verify reset
  const { count: totalCount } = await supabase
    .from('zip_code_cache')
    .select('*', { count: 'exact', head: true })
    
  const { count: coverageCount } = await supabase
    .from('zip_code_cache')
    .select('*', { count: 'exact', head: true })
    .eq('has_instacart_coverage', true)
  
  console.log(`✅ Reset complete: ${totalCount?.toLocaleString()} total ZIPs, ${coverageCount || 0} with coverage`)
  
  console.log('\n🎯 Ready to re-run coverage check with correct validation logic!')
  console.log('Run: node update-all-zip-codes.js --conservative')
}

fixCoverageData()