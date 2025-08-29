import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

interface WaitlistUser {
  id: string
  email: string
  zip_code: string
  first_name?: string
  last_name?: string
  city?: string
  state?: string
}

async function getWaitlistUsersForZip(zipCode: string): Promise<WaitlistUser[]> {
  const { data, error } = await supabase
    .from('waitlist')
    .select('*')
    .eq('zip_code', zipCode)
    .eq('notified', false)

  if (error) {
    console.error('Error fetching waitlist users:', error)
    throw error
  }

  return data || []
}

async function markUsersAsNotified(userIds: string[]): Promise<void> {
  const { error } = await supabase
    .from('waitlist')
    .update({ 
      notified: true, 
      notified_at: new Date().toISOString() 
    })
    .in('id', userIds)

  if (error) {
    console.error('Error marking users as notified:', error)
    throw error
  }
}

function createNotificationEmail(user: WaitlistUser) {
  const name = user.first_name || 'there'
  const location = user.city && user.state ? `${user.city}, ${user.state}` : `ZIP ${user.zip_code}`

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>ChefsCart is Now Available in Your Area!</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f97316; margin: 0;">🎉 Great News from ChefsCart!</h1>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 18px;">AI-Powered Meal Planning is Here</p>
        </div>
        
        <h2 style="color: #333;">Hi ${name}!</h2>
        
        <p style="font-size: 18px; color: #f97316; font-weight: bold;">ChefsCart is now available in ${location}! 🚀</p>
        
        <p>We're excited to let you know that you can now start creating personalized meal plans and get groceries delivered right to your door through our AI-powered platform.</p>
        
        <div style="background-color: #fef3e2; border-left: 4px solid #f97316; padding: 20px; margin: 25px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 15px 0; color: #f97316;">🍽️ Ready to get started?</h3>
          <p style="margin: 0 0 15px 0;">Create your first personalized meal plan in just 2 minutes:</p>
          <ul style="margin: 0 0 15px 0; padding-left: 20px;">
            <li><strong>Tell us your preferences:</strong> Cuisines, dietary needs, and cooking skill level</li>
            <li><strong>Get AI-curated meals:</strong> Personalized recipes just for you</li>
            <li><strong>Automatic shopping lists:</strong> Instacart-ready with all ingredients</li>
            <li><strong>Smart pantry management:</strong> Upload photos to optimize your groceries</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://chefscart.ai?utm_source=waitlist&utm_medium=email&utm_campaign=zip_available&zip=${user.zip_code}" 
             style="background-color: #f97316; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.25);">
            🚀 Create My Meal Plan Now
          </a>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h4 style="margin: 0 0 10px 0; color: #333;">✨ Special Launch Offer</h4>
          <p style="margin: 0; color: #666;">As one of our early waitlist members, you get priority access to all our premium features - completely free during our launch period!</p>
        </div>
        
        <p>Questions? We're here to help! Reply to this email or visit our help center.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #666; text-align: center;">
          Thanks for your patience while we expanded to ${location}!<br>
          ChefsCart Team 🧑‍🍳<br><br>
          You received this email because you joined our waitlist for ZIP ${user.zip_code}.<br>
          <a href="mailto:support@chefscart.ai" style="color: #f97316;">support@chefscart.ai</a>
        </p>
      </body>
    </html>
  `

  const textContent = `
🎉 Great News from ChefsCart!

Hi ${name}!

ChefsCart is now available in ${location}! 🚀

We're excited to let you know that you can now start creating personalized meal plans and get groceries delivered right to your door through our AI-powered platform.

Ready to get started?
Create your first personalized meal plan in just 2 minutes:

• Tell us your preferences: Cuisines, dietary needs, and cooking skill level
• Get AI-curated meals: Personalized recipes just for you  
• Automatic shopping lists: Instacart-ready with all ingredients
• Smart pantry management: Upload photos to optimize your groceries

✨ Special Launch Offer
As one of our early waitlist members, you get priority access to all our premium features - completely free during our launch period!

Get started now: https://chefscart.ai?utm_source=waitlist&utm_medium=email&utm_campaign=zip_available&zip=${user.zip_code}

Questions? We're here to help! Reply to this email or visit our help center.

Thanks for your patience while we expanded to ${location}!
ChefsCart Team 🧑‍🍳

You received this email because you joined our waitlist for ZIP ${user.zip_code}.
Contact us: support@chefscart.ai
  `

  return {
    subject: `🎉 ChefsCart is now available in ${location}!`,
    html: htmlContent,
    text: textContent
  }
}

async function sendNotificationEmails(users: WaitlistUser[]): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  for (const user of users) {
    try {
      const { subject, html, text } = createNotificationEmail(user)
      
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'ChefsCart <hello@chefscart.ai>',
        to: [user.email],
        subject,
        html,
        text,
      })

      if (error) {
        console.error(`Failed to send email to ${user.email}:`, error)
        failed++
      } else {
        sent++
      }
    } catch (error) {
      console.error(`Error sending email to ${user.email}:`, error)
      failed++
    }
  }

  return { sent, failed }
}

export async function POST(request: NextRequest) {
  try {
    const { zipCodes, apiKey } = await request.json()

    // Simple API key protection for cron job access
    const expectedApiKey = process.env.CRON_API_KEY || 'your-secure-api-key'
    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json({
        error: 'Unauthorized - Invalid API key'
      }, { status: 401 })
    }

    if (!zipCodes || !Array.isArray(zipCodes)) {
      return NextResponse.json({
        error: 'zipCodes array is required'
      }, { status: 400 })
    }


    let totalSent = 0
    let totalFailed = 0
    const results: Record<string, { sent: number; failed: number; users: number }> = {}

    for (const zipCode of zipCodes) {
      
      // Get users waiting for this ZIP code
      const users = await getWaitlistUsersForZip(zipCode)

      if (users.length === 0) {
        results[zipCode] = { sent: 0, failed: 0, users: 0 }
        continue
      }

      // Send notification emails
      const { sent, failed } = await sendNotificationEmails(users)
      
      // Mark successful users as notified
      if (sent > 0) {
        const successfulUserIds = users.slice(0, sent).map(u => u.id)
        await markUsersAsNotified(successfulUserIds)
      }

      totalSent += sent
      totalFailed += failed
      results[zipCode] = { sent, failed, users: users.length }

      console.log(`✅ ZIP ${zipCode}: ${sent} sent, ${failed} failed`)
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${zipCodes.length} ZIP codes`,
      totalSent,
      totalFailed,
      results
    })

  } catch (error) {
    console.error('Error processing waitlist notifications:', error)
    return NextResponse.json({
      error: 'Failed to process waitlist notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}