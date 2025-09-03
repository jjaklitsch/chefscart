/**
 * Comprehensive ZIP Code Database Update Script
 * 
 * This script systematically updates the entire ZIP code cache with corrected validation logic.
 * It uses the same retailer-checking logic from the fixed validate-zip-optimized endpoint.
 * 
 * Usage:
 *   node update-all-zip-codes.js [--start=ZIP] [--end=ZIP] [--conservative]
 * 
 * Options:
 *   --start=ZIP      Start from specific ZIP code (default: 00501)
 *   --end=ZIP        End at specific ZIP code (default: 99999)
 *   --conservative   Use slower rate limiting (10 req/sec vs 20 req/sec)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })

// Configuration
const BATCH_SIZE = 50
const CONSERVATIVE_RATE_LIMIT = 10 // requests per second
const DEFAULT_RATE_LIMIT = 20      // requests per second
const MAX_RETRIES = 3
const RETRY_DELAY = 5000 // 5 seconds

// Parse command line arguments
const args = process.argv.slice(2)
let startZip = '00501' // First valid US ZIP
let endZip = '99999'   // Last possible ZIP
let conservative = false

args.forEach(arg => {
  if (arg.startsWith('--start=')) {
    startZip = arg.split('=')[1]
  } else if (arg.startsWith('--end=')) {
    endZip = arg.split('=')[1]
  } else if (arg === '--conservative') {
    conservative = true
  }
})

const RATE_LIMIT = conservative ? CONSERVATIVE_RATE_LIMIT : DEFAULT_RATE_LIMIT
const DELAY_MS = Math.floor(1000 / RATE_LIMIT)

console.log(`🚀 Starting comprehensive ZIP code update`)
console.log(`📍 Range: ${startZip} to ${endZip}`)
console.log(`⚡ Rate limit: ${RATE_LIMIT} requests/second`)
console.log(`📦 Batch size: ${BATCH_SIZE}`)

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Check if ZIP code is in valid US ranges
function isValidUSZipRange(zip) {
  const num = parseInt(zip, 10)
  
  // Known valid US ZIP code ranges
  const validRanges = [
    [501, 599],     // NY, VT
    [600, 699],     // PR, VI, APO, FPO
    [700, 799],     // DC, MD, NC, SC, VA, WV
    [800, 999],     // TN, KY, IN, MI, OH
    [1000, 2799],   // MA, ME, NH, NJ, NY, RI, VT
    [2800, 3999],   // AL, FL, GA, MS, TN, NC, SC
    [4000, 4999],   // IN, KY, MI, OH
    [5000, 5999],   // IA, MN, MT, ND, SD, WI
    [6000, 6999],   // IL, KS, MO, NE
    [7000, 7999],   // AR, LA, OK, TX
    [8000, 8999],   // AZ, CO, ID, NM, NV, UT, WY
    [9000, 9999]    // AK, AS, CA, GU, HI, MH, FM, MP, PW, OR, WA
  ]
  
  return validRanges.some(([start, end]) => num >= start && num <= end)
}

// Load official ZIP codes from file
function loadOfficialZipCodes() {
  try {
    const fileContent = readFileSync('./official_us_zip_codes.txt', 'utf8')
    const zips = fileContent.trim().split('\n').map(zip => zip.trim())
    console.log(`📋 Loaded ${zips.length} official US ZIP codes from file`)
    return zips
  } catch (error) {
    console.error('❌ Error loading official ZIP codes file:', error.message)
    console.log('⚠️  Falling back to range-based generation')
    return generateZipCodesFromRange('00501', '99999')
  }
}

// Fallback: Generate array of ZIP codes to check (original method)
function generateZipCodesFromRange(start, end) {
  const zips = []
  const startNum = parseInt(start, 10)
  const endNum = parseInt(end, 10)
  
  for (let i = startNum; i <= endNum; i++) {
    const zip = i.toString().padStart(5, '0')
    if (isValidUSZipRange(zip)) {
      zips.push(zip)
    }
  }
  
  return zips
}

// Check Instacart coverage for a ZIP code (same logic as fixed validate-zip-optimized)
async function checkInstacartCoverage(zipCode, retryCount = 0) {
  const apiKey = process.env.INSTACART_API_KEY
  
  if (!apiKey) {
    console.warn('⚠️  INSTACART_API_KEY not configured')
    return { isValid: true, hasInstacartCoverage: false, error: 'no_api_key' }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    
    const response = await fetch(
      `${process.env.INSTACART_IDP_BASE_URL}/idp/v1/retailers?postal_code=${zipCode}&country_code=US`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    )
    
    clearTimeout(timeoutId)
    
    let hasInstacartCoverage = false
    
    if (response.ok) {
      // CRITICAL: Parse JSON to check if there are actual retailers (not just HTTP 200)
      const data = await response.json()
      hasInstacartCoverage = data && data.retailers && Array.isArray(data.retailers) && data.retailers.length > 0
    } else if (response.status === 404) {
      hasInstacartCoverage = false // No coverage
    } else if (response.status === 429) {
      // Rate limited - retry with exponential backoff
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount)
        console.log(`⏳ Rate limited for ZIP ${zipCode}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return checkInstacartCoverage(zipCode, retryCount + 1)
      } else {
        throw new Error(`Rate limited after ${MAX_RETRIES} retries`)
      }
    } else {
      throw new Error(`HTTP ${response.status}`)
    }

    return {
      isValid: true,
      hasInstacartCoverage,
      apiResponseStatus: response.status,
      source: 'api'
    }

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Error for ZIP ${zipCode}, retrying (${retryCount + 1}/${MAX_RETRIES}): ${error.message}`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return checkInstacartCoverage(zipCode, retryCount + 1)
    }
    
    return {
      isValid: false,
      hasInstacartCoverage: false,
      error: error.message,
      source: 'error'
    }
  }
}

// Update database with batch of results
async function updateDatabase(results) {
  if (results.length === 0) return

  const upsertData = results.map(result => ({
    zip_code: result.zipCode,
    is_valid: result.isValid,
    has_instacart_coverage: result.hasInstacartCoverage,
    last_updated: new Date().toISOString(),
    last_api_check: new Date().toISOString(),
    api_response_status: result.apiResponseStatus || null
  }))

  const { error } = await supabase
    .from('zip_code_cache')
    .upsert(upsertData)

  if (error) {
    console.error('❌ Database update error:', error)
    return false
  }

  console.log(`💾 Updated ${results.length} ZIP codes in database`)
  return true
}

// Process ZIP codes in batches
async function processBatch(zipCodes) {
  const results = []
  let successCount = 0
  let errorCount = 0
  let coverageCount = 0

  console.log(`\n📋 Processing batch of ${zipCodes.length} ZIP codes...`)

  for (const zipCode of zipCodes) {
    const result = await checkInstacartCoverage(zipCode)
    
    results.push({
      zipCode,
      isValid: result.isValid,
      hasInstacartCoverage: result.hasInstacartCoverage,
      apiResponseStatus: result.apiResponseStatus
    })

    if (result.isValid && !result.error) {
      successCount++
      if (result.hasInstacartCoverage) {
        coverageCount++
      }
    } else {
      errorCount++
    }

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, DELAY_MS))

    // Progress indicator
    if ((successCount + errorCount) % 10 === 0) {
      process.stdout.write('.')
    }
  }

  console.log(`\n✅ Batch complete: ${successCount} success, ${errorCount} errors, ${coverageCount} with coverage`)
  
  // Update database
  const dbSuccess = await updateDatabase(results)
  
  return {
    processed: results.length,
    success: successCount,
    errors: errorCount,
    coverage: coverageCount,
    dbSuccess
  }
}

// Main execution function
async function main() {
  const startTime = Date.now()
  
  try {
    // Load official ZIP codes from file
    console.log(`🔍 Loading official ZIP codes...`)
    const allZipCodes = loadOfficialZipCodes()
    
    // Filter by range if specified
    let zipCodes = allZipCodes
    if (startZip !== '00501' || endZip !== '99999') {
      zipCodes = allZipCodes.filter(zip => zip >= startZip && zip <= endZip)
      console.log(`📊 Filtered to ${zipCodes.length} ZIP codes in range ${startZip}-${endZip}`)
    } else {
      console.log(`📊 Using all ${zipCodes.length} official US ZIP codes`)
    }

    // Check if we should resume from a specific point
    console.log(`🔍 Checking for existing cache entries...`)
    const { data: existingCache } = await supabase
      .from('zip_code_cache')
      .select('zip_code')
      .gte('zip_code', startZip)
      .lte('zip_code', endZip)

    const existingZips = new Set(existingCache?.map(row => row.zip_code) || [])
    const remainingZips = zipCodes.filter(zip => !existingZips.has(zip))
    
    console.log(`📈 Progress: ${existingZips.size} already cached, ${remainingZips.length} remaining`)

    if (remainingZips.length === 0) {
      console.log('🎉 All ZIP codes in range are already cached!')
      return
    }

    // Process in batches
    let totalProcessed = 0
    let totalSuccess = 0
    let totalErrors = 0
    let totalCoverage = 0

    console.log(`\n🚀 Starting batch processing...`)
    
    for (let i = 0; i < remainingZips.length; i += BATCH_SIZE) {
      const batch = remainingZips.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(remainingZips.length / BATCH_SIZE)
      
      console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (ZIPs ${batch[0]} - ${batch[batch.length - 1]})`)
      
      const batchResult = await processBatch(batch)
      
      totalProcessed += batchResult.processed
      totalSuccess += batchResult.success
      totalErrors += batchResult.errors
      totalCoverage += batchResult.coverage

      // Progress summary
      const coveragePercent = totalSuccess > 0 ? ((totalCoverage / totalSuccess) * 100).toFixed(1) : '0.0'
      console.log(`📊 Overall progress: ${totalProcessed}/${remainingZips.length} processed, ${coveragePercent}% coverage`)

      // Brief pause between batches
      if (i + BATCH_SIZE < remainingZips.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Final summary
    const duration = Math.round((Date.now() - startTime) / 1000)
    const finalCoveragePercent = totalSuccess > 0 ? ((totalCoverage / totalSuccess) * 100).toFixed(2) : '0.00'
    
    console.log(`\n🎉 Update complete!`)
    console.log(`⏱️  Duration: ${duration} seconds`)
    console.log(`📊 Processed: ${totalProcessed} ZIP codes`)
    console.log(`✅ Success: ${totalSuccess}`)
    console.log(`❌ Errors: ${totalErrors}`)
    console.log(`🏪 Coverage: ${totalCoverage} ZIP codes (${finalCoveragePercent}%)`)
    console.log(`📈 Rate: ${Math.round(totalProcessed / (duration / 60))} ZIP codes/minute`)

  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { checkInstacartCoverage, loadOfficialZipCodes, generateZipCodesFromRange, isValidUSZipRange }