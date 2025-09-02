import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function analyzeDiscrepancy() {
  try {
    console.log('🔍 Analyzing ZIP code discrepancy...')
    
    // Read official ZIP codes
    const officialZips = new Set(
      readFileSync('official_us_zip_codes.txt', 'utf-8')
        .split('\n')
        .filter(zip => zip.trim().length === 5)
    )
    
    console.log(`📋 Official ZIP codes (Census): ${officialZips.size.toLocaleString()}`)
    
    // Get all ZIP codes from database
    const { data: dbZips, error } = await supabase
      .from('zip_code_cache')
      .select('zip_code')
    
    if (error) {
      console.error('Error getting database ZIP codes:', error)
      return
    }
    
    const dbZipSet = new Set(dbZips.map(row => row.zip_code))
    console.log(`💾 Database ZIP codes: ${dbZipSet.size.toLocaleString()}`)
    
    // Find ZIP codes in database but not in official list
    const extraZips = [...dbZipSet].filter(zip => !officialZips.has(zip))
    console.log(`➕ Extra ZIP codes in DB: ${extraZips.length.toLocaleString()}`)
    
    // Find ZIP codes in official list but not in database
    const missingZips = [...officialZips].filter(zip => !dbZipSet.has(zip))
    console.log(`➖ Missing ZIP codes from DB: ${missingZips.length.toLocaleString()}`)
    
    // Show examples
    if (extraZips.length > 0) {
      console.log('\n📝 Examples of extra ZIP codes in database:')
      extraZips.slice(0, 20).forEach(zip => console.log(`  - ${zip}`))
      if (extraZips.length > 20) {
        console.log(`  ... and ${extraZips.length - 20} more`)
      }
    }
    
    if (missingZips.length > 0) {
      console.log('\n📝 Examples of missing official ZIP codes:')
      missingZips.slice(0, 20).forEach(zip => console.log(`  + ${zip}`))
      if (missingZips.length > 20) {
        console.log(`  ... and ${missingZips.length - 20} more`)
      }
    }
    
    // Overlap analysis
    const overlap = [...officialZips].filter(zip => dbZipSet.has(zip))
    console.log(`\n🎯 ZIP codes in both: ${overlap.length.toLocaleString()}`)
    
    console.log('\n📊 Summary:')
    console.log(`  Official ZIP codes: ${officialZips.size.toLocaleString()}`)
    console.log(`  Database ZIP codes: ${dbZipSet.size.toLocaleString()}`)
    console.log(`  Overlap: ${overlap.length.toLocaleString()}`)
    console.log(`  Extra in DB: ${extraZips.length.toLocaleString()}`)
    console.log(`  Missing from DB: ${missingZips.length.toLocaleString()}`)

  } catch (error) {
    console.error('Error in analysis:', error)
  }
}

analyzeDiscrepancy()