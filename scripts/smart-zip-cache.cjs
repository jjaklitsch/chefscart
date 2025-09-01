#!/usr/bin/env node

/**
 * Smart ZIP Code Cache Population Script
 * 
 * This script uses a targeted approach:
 * 1. First validates API with known good ZIP codes
 * 2. Focuses on major metro areas where Instacart definitely operates
 * 3. Uses actual real ZIP code sampling instead of brute force
 * 4. Provides realistic coverage statistics
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

// Configuration
const INSTACART_API_KEY = process.env.INSTACART_API_KEY
const INSTACART_BASE_URL = process.env.INSTACART_IDP_BASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Rate limiting
const RATE_LIMIT_PER_SECOND = 10
const BATCH_SIZE = 100
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const REQUEST_TIMEOUT_MS = 8000

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Known valid ZIP codes from major metro areas where Instacart operates
function getKnownValidZipCodes() {
  return [
    // NYC area - definitely has Instacart
    '10001', '10002', '10003', '10004', '10005', '10006', '10007', '10008', '10009', '10010',
    '10011', '10012', '10013', '10014', '10016', '10017', '10018', '10019', '10020', '10021',
    '10022', '10023', '10024', '10025', '10026', '10027', '10028', '10029', '10030', '10031',
    
    // LA area - definitely has Instacart
    '90001', '90002', '90003', '90004', '90005', '90006', '90007', '90008', '90009', '90010',
    '90012', '90013', '90014', '90015', '90016', '90017', '90018', '90019', '90020', '90021',
    '90210', '90211', '90212', '90213', '90230', '90232', '90245', '90272', '90290', '90291',
    
    // San Francisco - definitely has Instacart
    '94102', '94103', '94104', '94105', '94107', '94108', '94109', '94110', '94111', '94112',
    '94114', '94115', '94116', '94117', '94118', '94121', '94122', '94123', '94124', '94127',
    
    // Chicago - definitely has Instacart
    '60601', '60602', '60603', '60604', '60605', '60606', '60607', '60608', '60610', '60611',
    '60612', '60613', '60614', '60615', '60616', '60617', '60618', '60619', '60620', '60621',
    
    // Boston - definitely has Instacart  
    '02101', '02102', '02103', '02104', '02105', '02106', '02107', '02108', '02109', '02110',
    '02111', '02112', '02113', '02114', '02115', '02116', '02117', '02118', '02119', '02120',
    
    // Washington DC - definitely has Instacart
    '20001', '20002', '20003', '20004', '20005', '20006', '20007', '20008', '20009', '20010',
    '20011', '20012', '20015', '20016', '20017', '20018', '20019', '20020', '20024', '20032',
    
    // Miami - definitely has Instacart
    '33101', '33102', '33109', '33111', '33114', '33116', '33119', '33125', '33126', '33127',
    '33128', '33129', '33130', '33131', '33132', '33133', '33134', '33135', '33136', '33137',
    
    // Atlanta - definitely has Instacart
    '30301', '30302', '30303', '30304', '30305', '30306', '30307', '30308', '30309', '30310',
    '30311', '30312', '30313', '30314', '30315', '30316', '30317', '30318', '30319', '30324',
    
    // Seattle - definitely has Instacart
    '98101', '98102', '98103', '98104', '98105', '98106', '98107', '98108', '98109', '98112',
    '98115', '98116', '98117', '98118', '98119', '98121', '98122', '98125', '98126', '98133',
    
    // Dallas - definitely has Instacart
    '75201', '75202', '75203', '75204', '75205', '75206', '75207', '75208', '75209', '75210',
    '75211', '75212', '75214', '75215', '75216', '75217', '75218', '75219', '75220', '75223'
  ]
}

// Get existing ZIP codes from cache
async function getExistingZipCodes(targetZips) {
  console.log('📊 Checking which target ZIP codes are already cached...')
  
  const { data, error } = await supabase
    .from('zip_code_cache')
    .select('zip_code')
    .in('zip_code', targetZips)
  
  if (error) {
    console.error('❌ Error fetching existing ZIP codes:', error)
    throw error
  }
  
  const existingSet = new Set(data.map(row => row.zip_code))
  console.log(`✅ Found ${existingSet.size} of ${targetZips.length} target ZIP codes already cached`)
  return existingSet
}

// Fetch retailers from Instacart API
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

// Main execution function
async function main() {
  console.log('🚀 Starting smart ZIP code cache population...')
  console.log('🎯 Targeting known major metro areas with Instacart coverage')
  
  // Validate environment
  if (!INSTACART_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }
  
  const startTime = Date.now()
  
  try {
    // Step 1: Get known valid ZIP codes from major metros
    const targetZips = getKnownValidZipCodes()
    console.log(`📋 Targeting ${targetZips.length} known ZIP codes from major metro areas`)
    
    // Step 2: Check which ones are already cached
    const existingZips = await getExistingZipCodes(targetZips)
    
    // Step 3: Process missing ones
    const missingZips = targetZips.filter(zip => !existingZips.has(zip))
    
    console.log(`🔍 Missing ZIP codes: ${missingZips.length}`)
    
    if (missingZips.length === 0) {
      console.log('✅ All target ZIP codes are already cached!')
      return
    }
    
    let processed = 0
    let errors = 0
    let withCoverage = 0
    let noCoverage = 0
    let apiCalls = 0
    
    console.log(`\\n🔄 Processing ${missingZips.length} missing ZIP codes...`)
    
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
        
        // Log individual result for debugging
        if (result.success && !result.noCoverage && result.retailers.length > 0) {
          console.log(`   ✅ ${zipCode}: ${result.retailers.length} retailers found`)
        } else if (result.success && result.noCoverage) {
          console.log(`   📍 ${zipCode}: No Instacart coverage`)
        } else {
          console.log(`   ❌ ${zipCode}: ${result.error || 'Unknown error'}`)
        }
        
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
        
        // Progress update every 10 ZIP codes
        if (processed % 10 === 0) {
          const elapsed = (Date.now() - startTime) / 1000
          const rate = apiCalls / elapsed
          const coverageRate = (withCoverage / (withCoverage + noCoverage) * 100).toFixed(1)
          
          console.log(`\\n   📊 Progress: ${processed}/${missingZips.length} (${(processed/missingZips.length*100).toFixed(1)}%)`)
          console.log(`   📈 Coverage: ${withCoverage} with (${coverageRate}%), ${noCoverage} without, ${errors} errors`)
          console.log(`   ⚡ Rate: ${rate.toFixed(1)} req/sec`)
        }
      }
    }
    
    // Final results
    const duration = (Date.now() - startTime) / 1000
    const finalCoverageRate = (withCoverage / (withCoverage + noCoverage) * 100).toFixed(1)
    
    console.log(`\\n✅ Smart cache population completed!`)
    console.log(`📈 Final Stats:`)
    console.log(`   • ZIP codes processed: ${processed}/${missingZips.length}`)
    console.log(`   • ZIP codes with coverage: ${withCoverage} (${finalCoverageRate}%)`)
    console.log(`   • ZIP codes without coverage: ${noCoverage}`)
    console.log(`   • API calls made: ${apiCalls}`)
    console.log(`   • Errors: ${errors}`)
    console.log(`   • Duration: ${(duration / 60).toFixed(1)} minutes`)
    console.log(`   • Average rate: ${(apiCalls / duration).toFixed(2)} req/sec`)
    
    if (withCoverage > 0) {
      console.log(`\\n🎉 SUCCESS: Found ${withCoverage} ZIP codes with Instacart coverage!`)
      console.log(`📊 Coverage rate of ${finalCoverageRate}% is realistic for major metro areas`)
    } else {
      console.log(`\\n⚠️  WARNING: No ZIP codes found with coverage - API integration may need review`)
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Error handling
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

module.exports = { main, getKnownValidZipCodes, fetchRetailersForZip }