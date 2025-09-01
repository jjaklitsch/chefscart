#!/usr/bin/env node

/**
 * Simple ZIP Code Coverage Check
 * 
 * This script efficiently checks ZIP codes for Instacart coverage without
 * collecting retailer data. Much faster and simpler:
 * 1. Check if Instacart API returns 200 (has coverage) or 404 (no coverage)
 * 2. Store only zip_code and has_instacart_coverage boolean
 * 3. Process in large batches for maximum efficiency
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

// Configuration
const INSTACART_API_KEY = process.env.INSTACART_API_KEY
const INSTACART_BASE_URL = process.env.INSTACART_IDP_BASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Aggressive settings since we're not processing response data
const RATE_LIMIT_PER_SECOND = process.argv.includes('--conservative') ? 10 : 20
const BATCH_SIZE = 1000 // Much larger batches
const MAX_RETRIES = 2  // Fewer retries needed
const RETRY_DELAY_MS = 1000
const REQUEST_TIMEOUT_MS = 5000 // Shorter timeout

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generate realistic US ZIP codes from known ranges
function generateLikelyZipCodes() {
  const zipCodes = []
  
  // Focus on the most populated ZIP ranges
  const ranges = [
    { start: 501, end: 999, name: 'Northeast Special' },
    { start: 1000, end: 14999, name: 'Northeast' },
    { start: 15000, end: 19999, name: 'Mid-Atlantic' }, 
    { start: 20000, end: 26999, name: 'DC/VA/MD' },
    { start: 27000, end: 34999, name: 'Southeast' },
    { start: 35000, end: 42999, name: 'South Central' },
    { start: 43000, end: 49999, name: 'Great Lakes' },
    { start: 50000, end: 56999, name: 'Upper Midwest' },
    { start: 57000, end: 59999, name: 'Northern Plains' },
    { start: 60000, end: 62999, name: 'Illinois' },
    { start: 63000, end: 69999, name: 'Central' },
    { start: 70000, end: 79999, name: 'South' },
    { start: 80000, end: 89999, name: 'Mountain' },
    { start: 90000, end: 99999, name: 'Pacific' }
  ]
  
  console.log('📍 Generating ZIP codes from known US ranges:')
  for (const range of ranges) {
    const count = range.end - range.start + 1
    console.log(`   ${range.name}: ${range.start.toString().padStart(5, '0')}-${range.end.toString().padStart(5, '0')} (${count.toLocaleString()} codes)`)
    
    for (let i = range.start; i <= range.end; i++) {
      zipCodes.push(i.toString().padStart(5, '0'))
    }
  }
  
  return zipCodes
}

// Quick coverage check - just need to know if API returns 200 or 404
async function checkZipCoverage(zipCode, retryCount = 0) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    
    const response = await fetch(
      `${INSTACART_BASE_URL}/idp/v1/retailers?postal_code=${zipCode}&country_code=US`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${INSTACART_API_KEY}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      }
    )
    
    clearTimeout(timeoutId)
    
    // We only care about the status code
    if (response.ok) {
      return { success: true, hasCoverage: true, status: response.status }
    } else if (response.status === 404) {
      return { success: true, hasCoverage: false, status: response.status }
    } else if (response.status === 429) {
      throw new Error('Rate limited')
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES && (error.message.includes('Rate limited') || error.message.includes('timeout'))) {
      await sleep(RETRY_DELAY_MS)
      return checkZipCoverage(zipCode, retryCount + 1)
    }
    
    return { success: false, error: error.message }
  }
}

// Save simple coverage result
async function saveCoverageToCache(zipCode, result) {
  const { success, hasCoverage, status, error } = result
  
  try {
    const { error: dbError } = await supabase
      .from('zip_code_cache')
      .upsert({
        zip_code: zipCode,
        is_valid: success,
        has_instacart_coverage: success ? hasCoverage : false,
        last_updated: new Date().toISOString(),
        last_api_check: new Date().toISOString(),
        api_response_status: status || null
      })
    
    return !dbError
  } catch (err) {
    console.error(`❌ DB error for ${zipCode}:`, err.message)
    return false
  }
}

// Get existing ZIP codes to avoid duplicates
async function getExistingZipCodes() {
  console.log('📊 Checking existing cache...')
  
  const existingZips = new Set()
  let from = 0
  const limit = 1000
  
  while (true) {
    const { data, error } = await supabase
      .from('zip_code_cache')
      .select('zip_code')
      .range(from, from + limit - 1)
    
    if (error) throw error
    if (!data || data.length === 0) break
    
    data.forEach(row => existingZips.add(row.zip_code))
    if (from % 10000 === 0) {
      console.log(`   Loaded ${existingZips.size} existing ZIP codes...`)
    }
    
    if (data.length < limit) break
    from += limit
  }
  
  console.log(`✅ Found ${existingZips.size} existing ZIP codes`)
  return existingZips
}

async function main() {
  console.log('🚀 Starting simple ZIP code coverage check...')
  console.log(`⚡ Rate: ${RATE_LIMIT_PER_SECOND} req/sec, Batch: ${BATCH_SIZE}`)
  
  if (!INSTACART_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing environment variables')
    process.exit(1)
  }
  
  const startTime = Date.now()
  
  try {
    // Get all likely ZIP codes
    const allZips = generateLikelyZipCodes()
    console.log(`📋 Generated ${allZips.length.toLocaleString()} possible ZIP codes`)
    
    // Check what's already processed
    const existingZips = await getExistingZipCodes()
    const missingZips = allZips.filter(zip => !existingZips.has(zip))
    
    console.log(`🎯 Missing: ${missingZips.length.toLocaleString()} ZIP codes to check`)
    
    if (missingZips.length === 0) {
      console.log('✅ All ZIP codes already checked!')
      return
    }
    
    let processed = 0
    let withCoverage = 0
    let withoutCoverage = 0
    let errors = 0
    
    console.log(`\\n🔄 Processing ${missingZips.length.toLocaleString()} ZIP codes...`)
    
    // Process in batches
    for (let i = 0; i < missingZips.length; i += BATCH_SIZE) {
      const batch = missingZips.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(missingZips.length / BATCH_SIZE)
      
      console.log(`\\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} ZIP codes)`)
      
      for (const zipCode of batch) {
        // Rate limiting
        await sleep(1000 / RATE_LIMIT_PER_SECOND)
        
        // Check coverage
        const result = await checkZipCoverage(zipCode)
        
        // Save result
        const saved = await saveCoverageToCache(zipCode, result)
        
        if (saved) {
          processed++
          if (result.success) {
            if (result.hasCoverage) {
              withCoverage++
            } else {
              withoutCoverage++
            }
          } else {
            errors++
          }
        } else {
          errors++
        }
        
        // Progress every 100 ZIP codes
        if (processed % 100 === 0) {
          const elapsed = (Date.now() - startTime) / 1000
          const rate = processed / elapsed
          const eta = (missingZips.length - processed) / rate / 60
          const coverageRate = ((withCoverage / (withCoverage + withoutCoverage)) * 100).toFixed(1)
          
          console.log(`   📊 ${processed}/${missingZips.length} (${(processed/missingZips.length*100).toFixed(1)}%) | Rate: ${rate.toFixed(1)}/sec | ETA: ${eta.toFixed(0)}min`)
          console.log(`   📈 Coverage: ${withCoverage} yes (${coverageRate}%), ${withoutCoverage} no, ${errors} errors`)
        }
      }
    }
    
    // Final stats
    const duration = (Date.now() - startTime) / 1000
    const coverageRate = ((withCoverage / (withCoverage + withoutCoverage)) * 100).toFixed(1)
    
    console.log(`\\n✅ Coverage check complete!`)
    console.log(`📈 Final Results:`)
    console.log(`   • Total processed: ${processed.toLocaleString()}`)
    console.log(`   • With coverage: ${withCoverage.toLocaleString()} (${coverageRate}%)`)
    console.log(`   • Without coverage: ${withoutCoverage.toLocaleString()}`)
    console.log(`   • Errors: ${errors.toLocaleString()}`)
    console.log(`   • Duration: ${(duration/60).toFixed(1)} minutes`)
    console.log(`   • Rate: ${(processed/duration).toFixed(1)} ZIP codes/second`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n⚠️ Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\\n⚠️ Shutting down gracefully...')
  process.exit(0)
})

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { main, generateLikelyZipCodes, checkZipCoverage }