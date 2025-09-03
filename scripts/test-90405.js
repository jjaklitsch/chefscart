import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test90405() {
  console.log('🧪 Testing ZIP 90405 (Santa Monica, CA)...')
  
  // Check database first
  const { data: cachedData, error } = await supabase
    .from('zip_code_cache')
    .select('*')
    .eq('zip_code', '90405')
    .single()
  
  if (error) {
    console.log('❌ Error checking database:', error)
  } else {
    console.log('💾 Database result:')
    console.log(`  ZIP: ${cachedData.zip_code}`)
    console.log(`  Valid: ${cachedData.is_valid}`)
    console.log(`  Has Coverage: ${cachedData.has_instacart_coverage}`)
    console.log(`  Last Updated: ${cachedData.last_updated}`)
    console.log(`  API Status: ${cachedData.api_response_status}`)
  }

  // Test direct API call
  console.log('\n🔍 Testing direct Instacart API call...')
  
  const apiKey = process.env.INSTACART_API_KEY
  if (!apiKey) {
    console.log('❌ No API key configured')
    return
  }

  try {
    const response = await fetch(
      `${process.env.INSTACART_IDP_BASE_URL}/idp/v1/retailers?postal_code=90405&country_code=US`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    )
    
    console.log(`📡 API Response: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ API Response Data:')
      console.log(`  Retailers count: ${data?.retailers?.length || 0}`)
      
      if (data?.retailers && Array.isArray(data.retailers)) {
        console.log('  Retailers:')
        data.retailers.slice(0, 5).forEach((retailer, i) => {
          console.log(`    ${i + 1}. ${retailer.name || 'Unknown'} (ID: ${retailer.id || 'N/A'})`)
        })
        if (data.retailers.length > 5) {
          console.log(`    ... and ${data.retailers.length - 5} more`)
        }
      }

      const hasRealCoverage = data && data.retailers && Array.isArray(data.retailers) && data.retailers.length > 0
      console.log(`🎯 Should have coverage: ${hasRealCoverage}`)
      
    } else {
      console.log('❌ API call failed')
      const errorText = await response.text()
      console.log('Error response:', errorText)
    }
    
  } catch (error) {
    console.log('💥 API call error:', error.message)
  }

  // Test our validate endpoint
  console.log('\n🌐 Testing our validate-zip endpoint...')
  try {
    const validateResponse = await fetch('http://localhost:3001/api/validate-zip-optimized', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ zipCode: '90405' })
    })
    
    if (validateResponse.ok) {
      const validateData = await validateResponse.json()
      console.log('✅ Our endpoint response:')
      console.log(`  Valid: ${validateData.isValid}`)
      console.log(`  Has Coverage: ${validateData.hasInstacartCoverage}`)
      console.log(`  Source: ${validateData.source}`)
      console.log(`  Message: ${validateData.message}`)
    } else {
      console.log('❌ Our endpoint failed:', validateResponse.status)
    }
  } catch (error) {
    console.log('💥 Our endpoint error:', error.message)
  }
}

test90405()