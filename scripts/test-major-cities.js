import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Test major city ZIP codes that should definitely have Instacart coverage
const testZips = [
  { zip: '10001', city: 'Manhattan, NY' },
  { zip: '90210', city: 'Beverly Hills, CA' }, 
  { zip: '60601', city: 'Chicago, IL' },
  { zip: '02101', city: 'Boston, MA' },
  { zip: '33101', city: 'Miami, FL' },
  { zip: '94102', city: 'San Francisco, CA' },
  { zip: '90405', city: 'Santa Monica, CA' }
]

async function testMajorCities() {
  console.log('🧪 Testing major city ZIP codes for coverage issues...')
  
  const apiKey = process.env.INSTACART_API_KEY
  if (!apiKey) {
    console.log('❌ No API key configured')
    return
  }

  const results = []
  
  for (const testCase of testZips) {
    console.log(`\n📍 Testing ${testCase.zip} (${testCase.city})...`)
    
    // Check database
    const { data: cachedData, error } = await supabase
      .from('zip_code_cache')
      .select('*')
      .eq('zip_code', testCase.zip)
      .maybeSingle()
    
    let dbCoverage = null
    if (error) {
      console.log('  ❌ Database error:', error.message)
    } else if (!cachedData) {
      console.log('  ⚪ Not in database')
    } else {
      dbCoverage = cachedData.has_instacart_coverage
      console.log(`  💾 Database: ${dbCoverage ? '✅ Has coverage' : '❌ No coverage'}`)
    }
    
    // Test API
    try {
      const response = await fetch(
        `${process.env.INSTACART_IDP_BASE_URL}/idp/v1/retailers?postal_code=${testCase.zip}&country_code=US`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        const retailerCount = data?.retailers?.length || 0
        const apiCoverage = retailerCount > 0
        console.log(`  📡 API: ${apiCoverage ? '✅' : '❌'} ${retailerCount} retailers`)
        
        results.push({
          zip: testCase.zip,
          city: testCase.city,
          dbCoverage,
          apiCoverage,
          retailerCount,
          mismatch: dbCoverage !== apiCoverage
        })
      } else {
        console.log(`  📡 API failed: ${response.status}`)
        results.push({
          zip: testCase.zip,
          city: testCase.city,
          dbCoverage,
          apiCoverage: null,
          retailerCount: 0,
          mismatch: false
        })
      }
    } catch (error) {
      console.log(`  💥 API error: ${error.message}`)
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  // Summary
  console.log('\n📊 SUMMARY:')
  console.log('='.repeat(70))
  
  const mismatches = results.filter(r => r.mismatch)
  console.log(`🎯 Total ZIP codes tested: ${results.length}`)
  console.log(`❌ Database/API mismatches: ${mismatches.length}`)
  
  if (mismatches.length > 0) {
    console.log('\n💥 MISMATCHED RESULTS:')
    mismatches.forEach(r => {
      console.log(`  ${r.zip} (${r.city}):`)
      console.log(`    Database: ${r.dbCoverage ? 'HAS coverage' : 'NO coverage'}`)
      console.log(`    API: ${r.apiCoverage ? 'HAS coverage' : 'NO coverage'} (${r.retailerCount} retailers)`)
    })
    
    console.log('\n🚨 CONCLUSION: Database coverage data is INCORRECT!')
    console.log('   The coverage script may have had bugs or the validation logic was wrong.')
    console.log('   We need to re-run coverage checks with the fixed validation logic.')
  } else {
    console.log('\n✅ All results match - database is accurate!')
  }
}

testMajorCities()