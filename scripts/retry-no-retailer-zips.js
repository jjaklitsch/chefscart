#!/usr/bin/env node

/**
 * Retry Script for ZIP codes with no retailers
 * This script identifies and retries ZIP codes that returned no retailers
 * but are likely false negatives (e.g., major city ZIPs)
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

// Import the fetch function from the main population script
const { fetchRetailersForZip, getRetailerPriority } = require('./populate-instacart-cache')

// Configuration
const INSTACART_API_KEY = process.env.INSTACART_API_KEY
const INSTACART_BASE_URL = process.env.INSTACART_IDP_BASE_URL
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Sleep function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Identify suspicious ZIP codes (major metro areas that should have coverage)
function isSuspiciousNoRetailer(zipCode) {
  // Major metro area prefixes that definitely should have Instacart
  const majorMetroPrefixes = [
    '100', '101', '102', '103', '104', // NYC area
    '021', '022', '023', '024',         // Boston area
    '191', '192',                        // Philadelphia
    '331', '332', '333',                 // Miami
    '606', '607',                        // Chicago
    '900', '901', '902', '903', '904',  // LA area
    '941', '942', '943', '944',         // San Francisco area
    '981', '982',                        // Seattle
    '787',                               // Austin
    '303',                               // Atlanta
    '200', '201', '202',                 // Washington DC area
  ]
  
  return majorMetroPrefixes.some(prefix => zipCode.startsWith(prefix))
}

// Save retailers to cache (reused from main script)
async function saveToCache(zipCode, apiResult) {
  const { success, retailers, status, noCoverage, error } = apiResult
  
  try {
    // Update ZIP code cache entry
    const { error: zipError } = await supabase
      .from('zip_code_cache')
      .upsert({
        zip_code: zipCode,
        is_valid: success,
        has_instacart_coverage: success && !noCoverage && retailers.length > 0,
        retailer_count: retailers?.length || 0,
        last_updated: new Date().toISOString(),
        last_api_check: new Date().toISOString(),
        api_response_status: status
      })
    
    if (zipError) {
      console.error(`❌ Error saving ZIP ${zipCode}:`, zipError)
      return false
    }
    
    // Delete old retailer entries first
    await supabase
      .from('retailers_cache')
      .delete()
      .eq('zip_code', zipCode)
    
    // Insert retailers if any exist
    if (success && retailers && retailers.length > 0) {
      const retailerRows = retailers.map(retailer => ({
        zip_code: zipCode,
        retailer_key: retailer.retailer_key,
        retailer_name: retailer.name,
        retailer_logo_url: retailer.retailer_logo_url,
        priority_score: getRetailerPriority(retailer.name),
        last_updated: new Date().toISOString()
      }))
      
      const { error: retailersError } = await supabase
        .from('retailers_cache')
        .insert(retailerRows)
      
      if (retailersError) {
        console.error(`❌ Error saving retailers for ${zipCode}:`, retailersError)
        return false
      }
      
      console.log(`✅ Updated ${zipCode}: ${retailers.length} retailers (was 0)`)
      return { updated: true, newCount: retailers.length }
    } else {
      console.log(`✅ Confirmed ${zipCode}: still no retailers`)
      return { updated: false, newCount: 0 }
    }
  } catch (err) {
    console.error(`❌ Database error for ${zipCode}:`, err)
    return false
  }
}

async function main() {
  console.log('🔄 Starting retry for ZIP codes with no retailers...\n')
  
  // Fetch all ZIP codes with no retailers
  const { data: noRetailerZips, error } = await supabase
    .from('zip_code_cache')
    .select('zip_code')
    .eq('retailer_count', 0)
    .order('zip_code')
  
  if (error) {
    console.error('Error fetching ZIP codes:', error)
    return
  }
  
  console.log(`📊 Found ${noRetailerZips.length} ZIP codes with no retailers\n`)
  
  // Filter to suspicious ones first
  const suspiciousZips = noRetailerZips.filter(z => isSuspiciousNoRetailer(z.zip_code))
  const otherZips = noRetailerZips.filter(z => !isSuspiciousNoRetailer(z.zip_code))
  
  console.log(`🎯 ${suspiciousZips.length} suspicious (major metro) ZIP codes`)
  console.log(`📍 ${otherZips.length} other ZIP codes\n`)
  
  // Process suspicious ones first
  const testMode = process.argv.includes('--test')
  const allZips = testMode 
    ? suspiciousZips.slice(0, 50) // Test with first 50 suspicious
    : [...suspiciousZips, ...otherZips.slice(0, 500)] // All suspicious + 500 others
  
  console.log(`🚀 Processing ${allZips.length} ZIP codes...\n`)
  
  let updated = 0
  let confirmed = 0
  let errors = 0
  let totalNewRetailers = 0
  
  for (let i = 0; i < allZips.length; i++) {
    const zipCode = allZips[i].zip_code
    
    // Rate limiting (10 req/sec to be safe during retry)
    await sleep(100)
    
    // Show progress
    if (i % 10 === 0) {
      console.log(`\\nProgress: ${i}/${allZips.length} (${Math.round(i/allZips.length*100)}%)`)
      console.log(`Stats: ${updated} updated, ${confirmed} confirmed, ${errors} errors`)
    }
    
    // Fetch from API
    const result = await fetchRetailersForZip(zipCode)
    
    if (!result.success && !result.noCoverage) {
      errors++
      continue
    }
    
    // Save to cache
    const saveResult = await saveToCache(zipCode, result)
    
    if (saveResult && saveResult.updated) {
      updated++
      totalNewRetailers += saveResult.newCount
    } else if (saveResult) {
      confirmed++
    } else {
      errors++
    }
  }
  
  console.log('\\n✅ Retry complete!')
  console.log('📈 Results:')
  console.log(`   • ZIP codes updated: ${updated}`)
  console.log(`   • ZIP codes confirmed (still no retailers): ${confirmed}`)
  console.log(`   • New retailers found: ${totalNewRetailers}`)
  console.log(`   • Errors: ${errors}`)
  console.log(`   • Average retailers per updated ZIP: ${updated > 0 ? Math.round(totalNewRetailers/updated) : 0}`)
}

// Run the script
if (require.main === module) {
  main().catch(console.error)
}