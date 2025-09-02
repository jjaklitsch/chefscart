import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function rebuildZipDatabase() {
  try {
    console.log('🔄 Starting complete ZIP code database rebuild...')
    
    // Read official ZIP codes
    const officialZips = readFileSync('official_us_zip_codes.txt', 'utf-8')
      .split('\n')
      .filter(zip => zip.trim().length === 5)
      .map(zip => zip.trim())
    
    console.log(`📋 Loaded ${officialZips.length.toLocaleString()} official ZIP codes`)
    
    // Clear existing database
    console.log('🗑️  Clearing existing ZIP code cache...')
    const { error: clearError } = await supabase
      .from('zip_code_cache')
      .delete()
      .neq('zip_code', 'dummy_never_matches')
    
    if (clearError) {
      console.error('Error clearing database:', clearError)
      return
    }
    
    // Verify it's empty
    const { count: emptyCount } = await supabase
      .from('zip_code_cache')
      .select('*', { count: 'exact', head: true })
    
    console.log(`✅ Cleared database: ${emptyCount} records remaining`)
    
    // Insert all official ZIP codes with default values
    console.log('📥 Inserting official ZIP codes...')
    const batchSize = 1000
    let insertedCount = 0
    
    for (let i = 0; i < officialZips.length; i += batchSize) {
      const batch = officialZips.slice(i, i + batchSize)
      
      const zipRecords = batch.map(zipCode => ({
        zip_code: zipCode,
        is_valid: true,
        has_instacart_coverage: false, // Default to false, will be updated by coverage script
        last_updated: new Date().toISOString(),
        last_api_check: new Date().toISOString(), // Set to current time instead of null
        api_response_status: null
      }))
      
      const { error } = await supabase
        .from('zip_code_cache')
        .insert(zipRecords)
      
      if (error) {
        console.error(`Error inserting batch ${i}-${i + batch.length}:`, error)
        continue
      }
      
      insertedCount += batch.length
      console.log(`  Inserted ${insertedCount}/${officialZips.length} ZIP codes...`)
    }
    
    // Verify final count
    const { count: finalCount, error: finalError } = await supabase
      .from('zip_code_cache')
      .select('*', { count: 'exact', head: true })
    
    if (finalError) {
      console.error('Error getting final count:', finalError)
      return
    }
    
    console.log('\n🎉 Database rebuild complete!')
    console.log('=' .repeat(50))
    console.log(`📊 Total ZIP codes: ${finalCount?.toLocaleString()}`)
    console.log(`📋 Official Census ZIP codes: ${officialZips.length.toLocaleString()}`)
    console.log(`✅ Match: ${finalCount === officialZips.length ? 'Perfect!' : 'Mismatch!'}`)
    console.log(`📍 Coverage: 0% (needs to be updated by running coverage script)`)
    console.log()
    console.log('📋 Next steps:')
    console.log('1. Run: node update-all-zip-codes.js --conservative')
    console.log('2. This will check Instacart coverage for all official ZIP codes')

  } catch (error) {
    console.error('💥 Error during rebuild:', error)
  }
}

rebuildZipDatabase()