import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Import the coverage check function
import { checkInstacartCoverage } from './update-all-zip-codes.js'

async function testUpdateLogic() {
  const testZips = ['90405', '10001', '02101'] // Santa Monica, Manhattan, Boston
  
  console.log('🧪 Testing update logic on sample ZIP codes...')
  
  for (const zipCode of testZips) {
    console.log(`\n📍 Testing ${zipCode}...`)
    
    // Test our coverage check function
    const result = await checkInstacartCoverage(zipCode)
    console.log('🔍 Coverage check result:')
    console.log(`  Valid: ${result.isValid}`)
    console.log(`  Has Coverage: ${result.hasInstacartCoverage}`)
    console.log(`  API Status: ${result.apiResponseStatus}`)
    console.log(`  Source: ${result.source || 'api'}`)
    
    if (result.error) {
      console.log(`  Error: ${result.error}`)
    }
    
    // Update database
    if (result.isValid && !result.error) {
      const { error } = await supabase
        .from('zip_code_cache')
        .upsert({
          zip_code: zipCode,
          is_valid: result.isValid,
          has_instacart_coverage: result.hasInstacartCoverage,
          last_updated: new Date().toISOString(),
          last_api_check: new Date().toISOString(),
          api_response_status: result.apiResponseStatus
        })
      
      if (error) {
        console.log(`❌ Database update error: ${error.message}`)
      } else {
        console.log(`✅ Database updated successfully`)
      }
    }
    
    // Verify database was updated correctly
    const { data: verification } = await supabase
      .from('zip_code_cache')
      .select('has_instacart_coverage')
      .eq('zip_code', zipCode)
      .single()
    
    if (verification) {
      console.log(`💾 Database verification: ${verification.has_instacart_coverage ? 'HAS coverage' : 'NO coverage'}`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 500)) // Rate limit
  }
  
  console.log('\n✅ Test complete - if all results look correct, the logic is working!')
}

testUpdateLogic()