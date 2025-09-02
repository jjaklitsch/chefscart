#!/usr/bin/env node

/**
 * Test Instacart API responses for known ZIP codes
 * This will help us understand how to properly detect coverage
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const INSTACART_API_KEY = process.env.INSTACART_API_KEY
const INSTACART_BASE_URL = process.env.INSTACART_IDP_BASE_URL

// Test cases: Known coverage vs no coverage
const testZipCodes = [
  { zip: '10001', area: 'Manhattan, NYC', expectedCoverage: true },
  { zip: '90210', area: 'Beverly Hills, CA', expectedCoverage: true },
  { zip: '94102', area: 'San Francisco, CA', expectedCoverage: true },
  { zip: '60601', area: 'Chicago, IL', expectedCoverage: true },
  { zip: '02101', area: 'Boston, MA', expectedCoverage: true },
  
  // Remote/rural areas that likely don't have coverage
  { zip: '59718', area: 'Big Sky, Montana', expectedCoverage: false },
  { zip: '99929', area: 'Wrangell, Alaska', expectedCoverage: false },
  { zip: '88310', area: 'Alamogordo, New Mexico', expectedCoverage: false },
  { zip: '82414', area: 'Cody, Wyoming', expectedCoverage: false },
  { zip: '83025', area: 'Teton Village, Wyoming', expectedCoverage: false },
  { zip: '59937', area: 'West Yellowstone, Montana', expectedCoverage: false },
]

async function testZipCode(zipCode, area, expectedCoverage) {
  try {
    console.log(`\n🧪 Testing ${zipCode} (${area})`)
    console.log(`   Expected coverage: ${expectedCoverage ? '✅ YES' : '❌ NO'}`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(
      `${INSTACART_BASE_URL}/idp/v1/retailers?postal_code=${zipCode}&country_code=US`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${INSTACART_API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    )
    
    clearTimeout(timeoutId)
    
    console.log(`   HTTP Status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`   Response structure:`, JSON.stringify(data, null, 2))
      
      // Check if retailers exist (correct structure is data.retailers)
      const hasRetailers = data && data.retailers && Array.isArray(data.retailers) && data.retailers.length > 0
      console.log(`   Has retailers: ${hasRetailers ? '✅ YES' : '❌ NO'}`)
      console.log(`   Retailer count: ${data?.retailers?.length || 0}`)
      
      if (hasRetailers && data.retailers.length > 0) {
        console.log(`   Sample retailer: ${data.retailers[0].name || 'Unknown'}`)
      }
      
      // Check if our expectation matches reality
      const actualCoverage = hasRetailers
      if (actualCoverage === expectedCoverage) {
        console.log(`   ✅ CORRECT: Coverage matches expectation`)
      } else {
        console.log(`   ❌ WRONG: Expected ${expectedCoverage}, got ${actualCoverage}`)
      }
      
      return { zipCode, area, expectedCoverage, actualCoverage, status: response.status, hasRetailers }
      
    } else if (response.status === 404) {
      console.log(`   ❌ No coverage (404)`)
      const actualCoverage = false
      if (actualCoverage === expectedCoverage) {
        console.log(`   ✅ CORRECT: Coverage matches expectation`)
      } else {
        console.log(`   ❌ WRONG: Expected ${expectedCoverage}, got ${actualCoverage}`)
      }
      
      return { zipCode, area, expectedCoverage, actualCoverage, status: response.status, hasRetailers: false }
      
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`)
      const responseText = await response.text()
      console.log(`   Response: ${responseText.substring(0, 200)}...`)
      
      return { zipCode, area, expectedCoverage, actualCoverage: null, status: response.status, error: responseText }
    }
    
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`)
    return { zipCode, area, expectedCoverage, actualCoverage: null, status: null, error: error.message }
  }
}

async function main() {
  console.log('🔬 Testing Instacart API Coverage Detection')
  console.log('===========================================')
  
  if (!INSTACART_API_KEY) {
    console.error('❌ INSTACART_API_KEY not found in environment')
    process.exit(1)
  }
  
  if (!INSTACART_BASE_URL) {
    console.error('❌ INSTACART_IDP_BASE_URL not found in environment')
    process.exit(1)
  }
  
  console.log(`📡 API Base URL: ${INSTACART_BASE_URL}`)
  console.log(`🔑 API Key: ${INSTACART_API_KEY.substring(0, 10)}...`)
  
  const results = []
  
  for (const testCase of testZipCodes) {
    const result = await testCase
    const testResult = await testZipCode(testCase.zip, testCase.area, testCase.expectedCoverage)
    results.push(testResult)
    
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n📊 SUMMARY')
  console.log('==========')
  
  let correct = 0
  let incorrect = 0
  let errors = 0
  
  for (const result of results) {
    if (result.error) {
      errors++
      console.log(`❌ ${result.zipCode}: ERROR - ${result.error}`)
    } else if (result.actualCoverage === result.expectedCoverage) {
      correct++
      console.log(`✅ ${result.zipCode}: CORRECT - ${result.actualCoverage ? 'Has' : 'No'} coverage`)
    } else {
      incorrect++
      console.log(`❌ ${result.zipCode}: WRONG - Expected ${result.expectedCoverage}, got ${result.actualCoverage}`)
    }
  }
  
  console.log(`\n📈 Results: ${correct} correct, ${incorrect} incorrect, ${errors} errors`)
  console.log(`   Accuracy: ${(correct / (correct + incorrect) * 100).toFixed(1)}%`)
  
  if (incorrect > 0 || errors > 0) {
    console.log('\n⚠️  ISSUE DETECTED: The current ZIP coverage script is likely producing false positives!')
    console.log('   Recommendation: Update the coverage detection logic to check for actual retailers in response')
  } else {
    console.log('\n✅ Coverage detection appears to be working correctly')
  }
}

main().catch(console.error)