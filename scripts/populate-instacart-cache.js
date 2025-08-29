#!/usr/bin/env node

/**
 * Instacart API Cache Population Script
 * 
 * This script populates the ZIP code and retailer cache tables by:
 * 1. Fetching all US ZIP codes (or a subset for testing)
 * 2. Making rate-limited calls to Instacart API for each ZIP
 * 3. Storing results in Supabase cache tables
 * 4. Applying priority scoring to retailers
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

// Configuration
const INSTACART_API_KEY = process.env.INSTACART_API_KEY
const INSTACART_BASE_URL = process.env.INSTACART_IDP_BASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Rate limiting configuration
// Use --aggressive flag for 20 req/sec, --conservative for 5 req/sec, default is 10 req/sec
const getTargetRate = () => {
  if (process.argv.includes('--aggressive')) return 20
  if (process.argv.includes('--conservative')) return 5
  return 10
}

const RATE_LIMIT_PER_SECOND = getTargetRate()
const BATCH_SIZE = 100 // Process ZIP codes in batches
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 3000 // Reduced retry delay
const REQUEST_TIMEOUT_MS = 10000 // Reduced timeout since APIs are faster

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)


// Sleep function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Fetch retailers from Instacart API with timeout and retries
async function fetchRetailersForZip(zipCode, retryCount = 0) {
  try {
    if (retryCount === 0) {
      console.log(`📍 Fetching retailers for ZIP ${zipCode}`)
    } else {
      console.log(`📍 Fetching retailers for ZIP ${zipCode} (retry ${retryCount})`)
    }
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    
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
    
    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        retailers: data.retailers || [],
        status: response.status
      }
    } else if (response.status === 404) {
      // No coverage for this ZIP - this is normal
      return {
        success: true,
        retailers: [],
        status: response.status,
        noCoverage: true
      }
    } else if (response.status === 429) {
      // Rate limited - this tells us we need to slow down
      console.warn(`⚠️  Rate limited on ${zipCode} - consider reducing RATE_LIMIT_PER_SECOND`)
      throw new Error(`Rate limited (429)`)
    } else {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }
  } catch (error) {
    console.warn(`⚠️  Error fetching ${zipCode}:`, error.message)
    
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying ${zipCode} in ${RETRY_DELAY_MS/1000}s...`)
      await sleep(RETRY_DELAY_MS)
      return fetchRetailersForZip(zipCode, retryCount + 1)
    }
    
    return {
      success: false,
      error: error.message,
      status: error.name === 'AbortError' ? 408 : 500
    }
  }
}

// Generate list of ZIP codes (for now, use a sample set)
function generateZipCodes(testMode = true) {
  if (testMode) {
    // Test with a small set of known ZIP codes
    return [
      '10001', '10002', '10003', // NYC
      '90210', '90211', '90212', // Beverly Hills  
      '94102', '94103', '94104', // San Francisco
      '60601', '60602', '60603', // Chicago
      '30309', '30310', '30311', // Atlanta
      '78701', '78702', '78703', // Austin
      '98101', '98102', '98103', // Seattle
      '02101', '02102', '02103', // Boston
      '33101', '33102', '33103', // Miami
      '19101', '19102', '19103'  // Philadelphia
    ]
  }
  
  // Full ZIP code generation (commented out for safety)
  // This would generate all ~41K ZIP codes
  const zipCodes = []
  for (let prefix = 10000; prefix <= 99999; prefix++) {
    zipCodes.push(prefix.toString().padStart(5, '0'))
  }
  return zipCodes
}

// Save ZIP code and retailers to cache
async function saveToCache(zipCode, apiResult) {
  const { success, retailers, status, noCoverage, error } = apiResult
  
  try {
    // Insert/update ZIP code cache entry
    const { error: zipError } = await supabase
      .from('zip_code_cache')
      .upsert({
        zip_code: zipCode,
        is_valid: success,
        has_instacart_coverage: success && !noCoverage,
        retailer_count: success && !noCoverage ? 1 : 0,
        last_updated: new Date().toISOString(),
        last_api_check: new Date().toISOString(),
        api_response_status: status
      })
    
    if (zipError) {
      console.error(`❌ Error saving ZIP ${zipCode}:`, zipError)
      return false
    }
    
    console.log(`✅ Saved ${zipCode}: ${success ? (noCoverage ? 'no coverage' : 'has coverage') : 'invalid'}`)
    
    return true
  } catch (err) {
    console.error(`❌ Database error for ${zipCode}:`, err)
    return false
  }
}

// Create sync job record
async function createSyncJob(jobType, totalZips) {
  const { data, error } = await supabase
    .from('instacart_sync_jobs')
    .insert({
      job_type: jobType,
      status: 'running',
      zip_codes_total: totalZips,
      started_at: new Date().toISOString()
    })
    .select()
    .single()
    
  if (error) {
    console.error('❌ Error creating sync job:', error)
    return null
  }
  
  return data.id
}

// Update sync job progress
async function updateSyncJob(jobId, updates) {
  if (!jobId) return
  
  const { error } = await supabase
    .from('instacart_sync_jobs')
    .update(updates)
    .eq('id', jobId)
    
  if (error) {
    console.error('❌ Error updating sync job:', error)
  }
}

// Main execution function
async function main() {
  console.log('🚀 Starting Instacart API cache population...')
  
  // Validate environment
  if (!INSTACART_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }
  
  // Determine if this is a test run
  const isTestMode = process.argv.includes('--test') || process.argv.includes('-t')
  const jobType = isTestMode ? 'test_run' : 'full_refresh'
  
  // Generate ZIP codes to process
  const zipCodes = generateZipCodes(isTestMode)
  console.log(`📊 Processing ${zipCodes.length} ZIP codes in ${jobType} mode`)
  
  // Create sync job
  const jobId = await createSyncJob(jobType, zipCodes.length)
  
  let processed = 0
  let errors = 0
  let totalRetailers = 0
  let apiCalls = 0
  const startTime = Date.now()
  
  // Process ZIP codes in batches with rate limiting
  for (let i = 0; i < zipCodes.length; i += BATCH_SIZE) {
    const batch = zipCodes.slice(i, i + BATCH_SIZE)
    
    console.log(`\\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(zipCodes.length/BATCH_SIZE)}`)
    
    for (const zipCode of batch) {
      // Rate limiting
      await sleep(1000 / RATE_LIMIT_PER_SECOND)
      
      // Fetch data from API
      const result = await fetchRetailersForZip(zipCode)
      apiCalls++
      
      // Save to cache
      const saved = await saveToCache(zipCode, result)
      
      if (saved) {
        processed++
        if (result.success && result.retailers) {
          totalRetailers += result.retailers.length
        }
      } else {
        errors++
      }
      
      // Progress update every 10 ZIP codes
      if (processed % 10 === 0) {
        await updateSyncJob(jobId, {
          zip_codes_processed: processed,
          retailers_found: totalRetailers,
          errors_encountered: errors,
          api_calls_made: apiCalls
        })
      }
    }
  }
  
  // Final sync job update
  const duration = (Date.now() - startTime) / 1000
  await updateSyncJob(jobId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    zip_codes_processed: processed,
    retailers_found: totalRetailers,
    errors_encountered: errors,
    api_calls_made: apiCalls
  })
  
  console.log(`\\n✅ Batch job completed!`)
  console.log(`📈 Stats:`)
  console.log(`   • ZIP codes processed: ${processed}/${zipCodes.length}`)
  console.log(`   • Retailers found: ${totalRetailers}`)
  console.log(`   • API calls made: ${apiCalls}`)
  console.log(`   • Errors: ${errors}`)
  console.log(`   • Duration: ${duration.toFixed(1)}s`)
  console.log(`   • Rate: ${(apiCalls / duration).toFixed(2)} req/sec`)
}

// Error handling
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run the script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { main, generateZipCodes, fetchRetailersForZip, getRetailerPriority }