#!/usr/bin/env node

/**
 * Test remote ZIP codes by temporarily clearing their cache entries
 * This will force the validate-zip-optimized endpoint to call the live API
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Test remote/rural ZIP codes that likely don't have coverage
const remoteZips = [
  { zip: '59718', area: 'Big Sky, Montana', expected: false },
  { zip: '99929', area: 'Wrangell, Alaska', expected: false },
  { zip: '88310', area: 'Alamogordo, New Mexico', expected: false },
  { zip: '82414', area: 'Cody, Wyoming', expected: false },
  { zip: '83025', area: 'Teton Village, Wyoming', expected: false },
]

async function testRemoteZip(zipCode, area, expectedCoverage) {
  try {
    console.log(`\n🧪 Testing ${zipCode} (${area})`)
    console.log(`   Expected coverage: ${expectedCoverage ? '✅ YES' : '❌ NO'}`)
    
    // First, clear the cache for this ZIP to force fresh API call
    console.log('   🗑️  Clearing cache entry...')
    await supabase
      .from('zip_code_cache')
      .delete()
      .eq('zip_code', zipCode)
    
    // Now call our validate endpoint which will hit the live API
    const response = await fetch('http://localhost:3001/api/validate-zip-optimized', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ zipCode })
    })
    
    const data = await response.json()
    
    console.log('   📡 API Response:', JSON.stringify(data, null, 2))
    
    const actualCoverage = data.hasInstacartCoverage === true
    
    if (actualCoverage === expectedCoverage) {
      console.log('   ✅ CORRECT: Coverage matches expectation')
      return { zipCode, area, expectedCoverage, actualCoverage, correct: true }
    } else {
      console.log('   ❌ WRONG: Expected', expectedCoverage, 'got', actualCoverage)
      return { zipCode, area, expectedCoverage, actualCoverage, correct: false }
    }
    
  } catch (error) {
    console.log('   💥 Error:', error.message)
    return { zipCode, area, expectedCoverage, actualCoverage: null, correct: false, error: error.message }
  }
}

async function main() {
  console.log('🏔️  Testing Remote ZIP Code Coverage')
  console.log('===================================')
  
  const results = []
  
  for (const testCase of remoteZips) {
    const result = await testRemoteZip(testCase.zip, testCase.area, testCase.expected)
    results.push(result)
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n📊 SUMMARY')
  console.log('==========')
  
  let correct = 0
  let incorrect = 0
  let errors = 0
  
  for (const result of results) {
    if (result.error) {
      errors++
      console.log(`❌ ${result.zipCode}: ERROR`)
    } else if (result.correct) {
      correct++
      console.log(`✅ ${result.zipCode}: CORRECT - ${result.actualCoverage ? 'Has' : 'No'} coverage`)
    } else {
      incorrect++
      console.log(`❌ ${result.zipCode}: WRONG - Expected ${result.expectedCoverage}, got ${result.actualCoverage}`)
    }
  }
  
  console.log(`\n📈 Results: ${correct} correct, ${incorrect} incorrect, ${errors} errors`)
  
  if (incorrect > 0) {
    console.log('\n⚠️  FALSE POSITIVES DETECTED!')
    console.log('   Our ZIP cache contains incorrect data.')
    console.log('   The original script was likely accepting 200 responses with empty retailer lists.')
    console.log('\n💡 RECOMMENDATION:')
    console.log('   1. Update simple-zip-coverage.cjs to check for actual retailers in response')
    console.log('   2. Re-run the coverage script with proper validation logic')
    console.log('   3. This will likely drop coverage from 98.98% to ~70-85%')
  } else {
    console.log('\n✅ Coverage detection appears accurate for these remote areas')
  }
}

main().catch(console.error)