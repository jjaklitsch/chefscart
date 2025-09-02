import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanZipDatabase() {
  try {
    console.log('🧹 Starting ZIP code database cleanup...')
    
    // Read official ZIP codes list
    const officialZips = readFileSync('official_us_zip_codes.txt', 'utf-8')
      .split('\n')
      .filter(zip => zip.trim().length === 5)
    
    console.log(`📋 Loaded ${officialZips.length} official ZIP codes from Census Bureau`)
    
    // Get current database stats
    const { count: currentTotal, error: totalError } = await supabase
      .from('zip_code_cache')
      .select('*', { count: 'exact', head: true })
    
    if (totalError) {
      console.error('Error getting current total:', totalError)
      return
    }
    
    console.log(`📊 Current database has ${currentTotal?.toLocaleString()} ZIP codes`)
    
    // Find ZIP codes to remove (those not in official list)
    console.log('🔍 Finding unofficial ZIP codes to remove...')
    const officialZipSet = new Set(officialZips)
    
    const { data: allZipsData, error: allZipsError } = await supabase
      .from('zip_code_cache')
      .select('zip_code')
    
    if (allZipsError) {
      console.error('Error getting all ZIP codes:', allZipsError)
      return
    }
    
    const zipcodesToRemove = allZipsData
      .filter(row => !officialZipSet.has(row.zip_code))
      .map(row => row.zip_code)
    
    console.log(`❌ Found ${zipcodesToRemove.length} unofficial ZIP codes to remove`)
    
    if (zipcodesToRemove.length === 0) {
      console.log('✅ Database already contains only official ZIP codes!')
      return
    }
    
    // Show some examples of what will be removed
    console.log('📝 Examples of unofficial ZIP codes being removed:')
    zipcodesToRemove.slice(0, 10).forEach(zip => console.log(`  - ${zip}`))
    if (zipcodesToRemove.length > 10) {
      console.log(`  ... and ${zipcodesToRemove.length - 10} more`)
    }
    
    // Remove unofficial ZIP codes in batches
    console.log('🗑️  Removing unofficial ZIP codes...')
    const batchSize = 1000
    let removedCount = 0
    
    for (let i = 0; i < zipcodesToRemove.length; i += batchSize) {
      const batch = zipcodesToRemove.slice(i, i + batchSize)
      
      const { error } = await supabase
        .from('zip_code_cache')
        .delete()
        .in('zip_code', batch)
      
      if (error) {
        console.error(`Error removing batch ${i}-${i + batch.length}:`, error)
        continue
      }
      
      removedCount += batch.length
      console.log(`  Removed ${removedCount}/${zipcodesToRemove.length} ZIP codes...`)
    }
    
    // Get final stats
    const { count: finalTotal, error: finalTotalError } = await supabase
      .from('zip_code_cache')
      .select('*', { count: 'exact', head: true })
    
    const { count: finalCoverage, error: finalCoverageError } = await supabase
      .from('zip_code_cache')
      .select('*', { count: 'exact', head: true })
      .eq('has_instacart_coverage', true)
    
    if (finalTotalError || finalCoverageError) {
      console.error('Error getting final stats:', finalTotalError || finalCoverageError)
      return
    }
    
    const coveragePercent = finalTotal ? ((finalCoverage / finalTotal) * 100).toFixed(2) : '0.00'
    
    console.log('\n🎉 Database cleanup complete!')
    console.log('=' .repeat(50))
    console.log(`📊 Before: ${currentTotal?.toLocaleString()} ZIP codes`)
    console.log(`📊 After:  ${finalTotal?.toLocaleString()} ZIP codes`)
    console.log(`❌ Removed: ${(currentTotal - finalTotal).toLocaleString()} unofficial ZIP codes`)
    console.log(`✅ Coverage: ${finalCoverage?.toLocaleString()} ZIP codes (${coveragePercent}%)`)
    console.log()
    console.log('✨ Database now contains only official Census Bureau ZCTA ZIP codes!')

  } catch (error) {
    console.error('💥 Error during cleanup:', error)
  }
}

cleanZipDatabase()