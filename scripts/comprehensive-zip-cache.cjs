#!/usr/bin/env node

/**
 * Comprehensive ZIP Code Cache Population Script
 * 
 * This script ensures complete US ZIP code coverage by:
 * 1. Generating all possible 5-digit ZIP codes (00000-99999)
 * 2. Identifying gaps in the existing cache
 * 3. Processing missing ZIP codes in efficient batches
 * 4. Running in background with progress tracking
 * 5. Handling rate limiting and retries properly
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

// Configuration
const INSTACART_API_KEY = process.env.INSTACART_API_KEY
const INSTACART_BASE_URL = process.env.INSTACART_IDP_BASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Rate limiting - conservative for comprehensive processing
const RATE_LIMIT_PER_SECOND = process.argv.includes('--aggressive') ? 15 : 10
const BATCH_SIZE = 500 // Larger batches for efficiency
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const REQUEST_TIMEOUT_MS = 8000

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Sleep function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generate all possible US ZIP codes (00000-99999)
function generateAllZipCodes() {
  const zipCodes = []
  for (let i = 0; i <= 99999; i++) {
    zipCodes.push(i.toString().padStart(5, '0'))
  }
  return zipCodes
}

// Get existing ZIP codes from cache
async function getExistingZipCodes() {
  console.log('📊 Fetching existing ZIP codes from cache...')
  
  const existingZips = new Set()
  let from = 0
  const limit = 1000
  
  while (true) {
    const { data, error } = await supabase
      .from('zip_code_cache')
      .select('zip_code')
      .range(from, from + limit - 1)
      .order('zip_code')
    
    if (error) {
      console.error('❌ Error fetching existing ZIP codes:', error)
      throw error
    }
    
    if (!data || data.length === 0) break
    
    data.forEach(row => existingZips.add(row.zip_code))
    console.log(`   Loaded ${existingZips.size} existing ZIP codes...`)
    
    if (data.length < limit) break
    from += limit
  }
  
  console.log(`✅ Found ${existingZips.size} existing ZIP codes in cache`)
  return existingZips
}

// Identify missing ZIP codes
function findMissingZipCodes(allZips, existingZips) {
  console.log('🔍 Identifying missing ZIP codes...')
  
  const missing = allZips.filter(zip => !existingZips.has(zip))
  
  // Analyze gaps by range
  const ranges = {
    '0xxxx': missing.filter(z => z.startsWith('0')).length,
    '1xxxx': missing.filter(z => z.startsWith('1')).length,
    '2xxxx': missing.filter(z => z.startsWith('2')).length,
    '3xxxx': missing.filter(z => z.startsWith('3')).length,
    '4xxxx': missing.filter(z => z.startsWith('4')).length,
    '5xxxx': missing.filter(z => z.startsWith('5')).length,
    '6xxxx': missing.filter(z => z.startsWith('6')).length,
    '7xxxx': missing.filter(z => z.startsWith('7')).length,
    '8xxxx': missing.filter(z => z.startsWith('8')).length,
    '9xxxx': missing.filter(z => z.startsWith('9')).length
  }
  
  console.log('📈 Missing ZIP codes by range:')
  Object.entries(ranges).forEach(([range, count]) => {
    if (count > 0) {
      console.log(`   ${range}: ${count.toLocaleString()}`)
    }
  })
  
  console.log(`🎯 Total missing: ${missing.length.toLocaleString()} ZIP codes`)
  return missing
}

// Fetch retailers from Instacart API with proper error handling
async function fetchRetailersForZip(zipCode, retryCount = 0) {
  try {
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
        status: response.status,
        noCoverage: false
      }
    } else if (response.status === 404) {
      // No coverage for this ZIP - this is normal and expected
      return {
        success: true,
        retailers: [],
        status: response.status,
        noCoverage: true
      }
    } else if (response.status === 429) {
      console.warn(`⚠️  Rate limited on ${zipCode}`)
      throw new Error(`Rate limited (429)`)
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying ${zipCode} (${retryCount + 1}/${MAX_RETRIES})`)
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

// Save ZIP code result to cache
async function saveToCache(zipCode, apiResult) {
  const { success, retailers, status, noCoverage, error } = apiResult
  
  try {
    const { error: zipError } = await supabase
      .from('zip_code_cache')
      .upsert({
        zip_code: zipCode,
        is_valid: success,
        has_instacart_coverage: success && !noCoverage && (retailers?.length || 0) > 0,
        last_updated: new Date().toISOString(),
        last_api_check: new Date().toISOString(),
        api_response_status: status
      })
    
    if (zipError) {
      console.error(`❌ Error saving ZIP ${zipCode}:`, zipError)
      return false
    }
    
    return true
  } catch (err) {
    console.error(`❌ Database error for ${zipCode}:`, err)
    return false
  }
}

// Create sync job record
async function createSyncJob(missingCount) {
  const { data, error } = await supabase
    .from('instacart_sync_jobs')
    .insert({
      job_type: 'comprehensive_gap_fill',
      status: 'running',
      zip_codes_total: missingCount,
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
  console.log('🚀 Starting comprehensive ZIP code cache population...')
  console.log(`⚡ Rate limit: ${RATE_LIMIT_PER_SECOND} req/sec, Batch size: ${BATCH_SIZE}`)
  
  // Validate environment
  if (!INSTACART_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }
  
  const startTime = Date.now()
  
  try {
    // Step 1: Get all possible ZIP codes
    const allZipCodes = generateAllZipCodes()
    console.log(`📋 Generated ${allZipCodes.length.toLocaleString()} possible ZIP codes (00000-99999)`)
    
    // Step 2: Get existing cached ZIP codes
    const existingZips = await getExistingZipCodes()
    
    // Step 3: Find missing ZIP codes
    const missingZips = findMissingZipCodes(allZipCodes, existingZips)
    
    if (missingZips.length === 0) {
      console.log('✅ No missing ZIP codes found. Cache is complete!')
      return
    }
    
    // Step 4: Process missing ZIP codes in batches
    const jobId = await createSyncJob(missingZips.length)
    
    let processed = 0
    let errors = 0
    let withCoverage = 0
    let noCoverage = 0
    let apiCalls = 0
    
    console.log(`\\n🔄 Processing ${missingZips.length.toLocaleString()} missing ZIP codes...`)
    
    for (let i = 0; i < missingZips.length; i += BATCH_SIZE) {
      const batch = missingZips.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(missingZips.length / BATCH_SIZE)
      
      console.log(`\\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} ZIP codes)`)
      
      for (const zipCode of batch) {
        // Rate limiting
        await sleep(1000 / RATE_LIMIT_PER_SECOND)
        
        // Fetch from API
        const result = await fetchRetailersForZip(zipCode)
        apiCalls++
        
        // Save to cache
        const saved = await saveToCache(zipCode, result)
        
        if (saved) {
          processed++
          if (result.success) {
            if (result.noCoverage || (result.retailers?.length || 0) === 0) {
              noCoverage++
            } else {
              withCoverage++
            }
          }
        } else {
          errors++
        }
        
        // Progress update every 50 ZIP codes
        if (processed % 50 === 0) {
          const elapsed = (Date.now() - startTime) / 1000
          const rate = apiCalls / elapsed
          const eta = (missingZips.length - processed) / rate / 3600 // hours
          
          console.log(`   Progress: ${processed}/${missingZips.length} (${(processed/missingZips.length*100).toFixed(1)}%)`)
          console.log(`   Rate: ${rate.toFixed(1)} req/sec, ETA: ${eta.toFixed(1)} hours`)
          console.log(`   Coverage: ${withCoverage} with, ${noCoverage} without, ${errors} errors`)
          
          await updateSyncJob(jobId, {
            zip_codes_processed: processed,
            errors_encountered: errors,
            api_calls_made: apiCalls
          })
        }
      }
    }
    
    // Final update
    const duration = (Date.now() - startTime) / 1000
    await updateSyncJob(jobId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      zip_codes_processed: processed,
      errors_encountered: errors,
      api_calls_made: apiCalls
    })
    
    console.log(`\\n✅ Comprehensive cache population completed!`)
    console.log(`📈 Final Stats:`)
    console.log(`   • ZIP codes processed: ${processed.toLocaleString()}/${missingZips.length.toLocaleString()}`)
    console.log(`   • ZIP codes with coverage: ${withCoverage.toLocaleString()}`)
    console.log(`   • ZIP codes without coverage: ${noCoverage.toLocaleString()}`)
    console.log(`   • API calls made: ${apiCalls.toLocaleString()}`)
    console.log(`   • Errors: ${errors.toLocaleString()}`)
    console.log(`   • Duration: ${(duration / 3600).toFixed(1)} hours`)
    console.log(`   • Average rate: ${(apiCalls / duration).toFixed(2)} req/sec`)
    console.log(`   • Coverage rate: ${(withCoverage / (withCoverage + noCoverage) * 100).toFixed(1)}%`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Error handling for background processing
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n⚠️  Received SIGINT. Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\\n⚠️  Received SIGTERM. Shutting down gracefully...')
  process.exit(0)
})

// Run the script
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { main, generateAllZipCodes, findMissingZipCodes, fetchRetailersForZip }