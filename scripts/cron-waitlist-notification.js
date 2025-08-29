#!/usr/bin/env node

/**
 * Cron job script to check for newly supported ZIP codes and notify waitlist users
 * This should be run monthly after the Instacart cache update
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getNewlySupportedZipCodes() {
  console.log('🔍 Checking for newly supported ZIP codes...')
  
  // Get ZIP codes that are now supported but have waitlist users who haven't been notified
  const { data, error } = await supabase
    .from('waitlist')
    .select('zip_code')
    .eq('notified', false)
    .not('zip_code', 'is', null)

  if (error) {
    console.error('❌ Error fetching waitlist ZIP codes:', error)
    throw error
  }

  if (!data || data.length === 0) {
    console.log('✅ No users on waitlist to notify')
    return []
  }

  const waitlistZipCodes = [...new Set(data.map(row => row.zip_code))]
  console.log(`📊 Found ${waitlistZipCodes.length} unique ZIP codes with waitlist users`)

  // Check which of these ZIP codes are now supported in our cache
  const supportedZips = []
  
  for (const zipCode of waitlistZipCodes) {
    const { data: cacheData, error: cacheError } = await supabase
      .from('zip_code_cache')
      .select('has_coverage')
      .eq('zip_code', zipCode)
      .eq('has_coverage', true)
      .single()

    if (!cacheError && cacheData) {
      supportedZips.push(zipCode)
      console.log(`✅ ZIP ${zipCode} is now supported`)
    }
  }

  console.log(`🎉 Found ${supportedZips.length} newly supported ZIP codes:`, supportedZips)
  return supportedZips
}

async function notifyWaitlistUsers(zipCodes) {
  if (zipCodes.length === 0) {
    console.log('ℹ️  No ZIP codes to notify')
    return
  }

  console.log(`📧 Sending notifications for ${zipCodes.length} ZIP codes...`)

  const response = await fetch(`${process.env.NEXTJS_URL || 'http://localhost:3000'}/api/notify-waitlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      zipCodes,
      apiKey: process.env.CRON_API_KEY
    })
  })

  const result = await response.json()

  if (!response.ok) {
    console.error('❌ Failed to send notifications:', result)
    throw new Error(result.error || 'Failed to send notifications')
  }

  console.log('✅ Notification results:', result)
  console.log(`📧 Total sent: ${result.totalSent}, Failed: ${result.totalFailed}`)
  
  return result
}

async function main() {
  try {
    console.log('🚀 Starting waitlist notification cron job...')
    console.log(`📅 Started at: ${new Date().toISOString()}`)
    
    // Get newly supported ZIP codes
    const supportedZipCodes = await getNewlySupportedZipCodes()
    
    if (supportedZipCodes.length === 0) {
      console.log('✅ No new ZIP codes to process. Job completed.')
      return
    }
    
    // Notify users
    const results = await notifyWaitlistUsers(supportedZipCodes)
    
    console.log('🎉 Waitlist notification job completed successfully!')
    console.log(`📊 Summary: ${results.totalSent} emails sent, ${results.totalFailed} failed`)
    
  } catch (error) {
    console.error('💥 Waitlist notification job failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { main, getNewlySupportedZipCodes, notifyWaitlistUsers }