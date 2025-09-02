#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Test extremely remote ZIP codes that almost certainly don't have coverage
const extremelyRemoteZips = [
  { zip: '99950', area: 'Ketchikan, Alaska', expected: false },
  { zip: '59936', area: 'West Glacier, Montana', expected: false },
  { zip: '83013', area: 'Moose, Wyoming (Grand Teton)', expected: false },
  { zip: '99901', area: 'Ketchikan, Alaska', expected: false },
  { zip: '96863', area: 'Lanai City, Hawaii', expected: false },
  
  // Test a few that should definitely HAVE coverage for comparison
  { zip: '10001', area: 'Manhattan, NYC', expected: true },
  { zip: '90210', area: 'Beverly Hills, CA', expected: true },
]

async function testZip(zipCode, area, expectedCoverage) {
  try {
    console.log(`\n🧪 Testing ${zipCode} (${area})`)
    console.log(`   Expected coverage: ${expectedCoverage ? '✅ YES' : '❌ NO'}`)
    
    // Clear cache
    await supabase.from('zip_code_cache').delete().eq('zip_code', zipCode)
    
    // Test via our endpoint
    const response = await fetch('http://localhost:3001/api/validate-zip-optimized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zipCode })
    })
    
    const data = await response.json()
    const actualCoverage = data.hasInstacartCoverage === true
    
    console.log(`   📡 Result: ${actualCoverage ? '✅ HAS' : '❌ NO'} coverage (source: ${data.source})`)
    
    if (actualCoverage === expectedCoverage) {
      console.log('   ✅ CORRECT')
      return { zipCode, correct: true, actualCoverage }
    } else {
      console.log(`   ❌ WRONG: Expected ${expectedCoverage}, got ${actualCoverage}`)
      return { zipCode, correct: false, expectedCoverage, actualCoverage }
    }
    
  } catch (error) {
    console.log('   💥 Error:', error.message)
    return { zipCode, correct: false, error: error.message }
  }
}

async function main() {
  console.log('🏔️  Testing Extremely Remote ZIP Codes')
  console.log('=====================================')
  
  const results = []
  
  for (const testCase of extremelyRemoteZips) {
    const result = await testZip(testCase.zip, testCase.area, testCase.expected)
    results.push(result)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  const correct = results.filter(r => r.correct).length
  const total = results.length
  
  console.log(`\n📊 FINAL RESULTS: ${correct}/${total} correct (${(correct/total*100).toFixed(1)}%)`)
  
  const falsePositives = results.filter(r => !r.correct && r.actualCoverage === true && r.expectedCoverage === false)
  const falseNegatives = results.filter(r => !r.correct && r.actualCoverage === false && r.expectedCoverage === true)
  
  if (falsePositives.length > 0) {
    console.log(`\n⚠️  ${falsePositives.length} FALSE POSITIVES (showing coverage where there shouldn't be any)`)
  }
  
  if (falseNegatives.length > 0) {
    console.log(`\n⚠️  ${falseNegatives.length} FALSE NEGATIVES (not showing coverage where there should be)`)
  }
  
  if (correct === total) {
    console.log('\n✅ All tests passed! Coverage detection is working correctly.')
  }
}

main().catch(console.error)