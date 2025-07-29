import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

interface WaitlistEntry {
  email: string
  zipCode: string
  firstName?: string
  lastName?: string
  city?: string
  state?: string
  createdAt: Date
  source: 'zip_validation' | 'manual'
}

interface WaitlistRequest {
  email: string
  zipCode: string
  firstName?: string
  lastName?: string
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidZipCode(zipCode: string): boolean {
  return /^\d{5}$/.test(zipCode)
}

async function validateZipCodeFormat(zipCode: string): Promise<boolean> {
  // Just validate 5-digit format
  return /^\d{5}$/.test(zipCode)
}

async function checkExistingWaitlistEntry(email: string, zipCode: string): Promise<boolean> {
  try {
    const db = (await import('@/lib/firebase-admin')).adminDb()
    const waitlistRef = db.collection('waitlist')
    const query = await waitlistRef
      .where('email', '==', email.toLowerCase())
      .where('zipCode', '==', zipCode)
      .limit(1)
      .get()

    return !query.empty
  } catch (error) {
    console.error('Error checking existing waitlist entry:', error)
    return false
  }
}

async function addToWaitlist(entry: WaitlistEntry): Promise<string> {
  try {
    const db = (await import('@/lib/firebase-admin')).adminDb()
    const waitlistRef = db.collection('waitlist')
    const docRef = await waitlistRef.add(entry)
    return docRef.id
  } catch (error) {
    console.error('Error adding to waitlist:', error)
    throw new Error('Failed to add to waitlist database')
  }
}

async function sendWaitlistConfirmationEmail(
  email: string,
  firstName?: string,
  city?: string,
  state?: string
): Promise<void> {
  try {
    const name = firstName || 'there'
    const location = city && state ? `${city}, ${state}` : 'your area'

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Welcome to ChefsCart Waitlist</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f97316; margin: 0;">ChefsCart</h1>
            <p style="color: #666; margin: 5px 0 0 0;">AI-Powered Meal Planning</p>
          </div>
          
          <h2 style="color: #333;">Hi ${name}!</h2>
          
          <p>Thank you for joining the ChefsCart waitlist! We're excited to let you know that we're working hard to bring our AI-powered meal planning and grocery delivery service to ${location}.</p>
          
          <div style="background-color: #fef3e2; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #f97316;">What to expect:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Personalized meal plans created by AI</li>
              <li>Automatic grocery lists optimized for your preferences</li>
              <li>Seamless Instacart integration for delivery</li>
              <li>Smart pantry management and recipe suggestions</li>
            </ul>
          </div>
          
          <p>We'll notify you as soon as ChefsCart becomes available in your area. In the meantime, follow us on social media for updates and meal planning tips!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://chefscart.ai" style="background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Visit ChefsCart</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #666; text-align: center;">
            You're receiving this email because you signed up for the ChefsCart waitlist.<br>
            If you have any questions, reply to this email or contact us at support@chefscart.ai
          </p>
        </body>
      </html>
    `

    const textContent = `
Hi ${name}!

Thank you for joining the ChefsCart waitlist! We're excited to let you know that we're working hard to bring our AI-powered meal planning and grocery delivery service to ${location}.

What to expect:
• Personalized meal plans created by AI
• Automatic grocery lists optimized for your preferences  
• Seamless Instacart integration for delivery
• Smart pantry management and recipe suggestions

We'll notify you as soon as ChefsCart becomes available in your area.

Visit us at: https://chefscart.ai

Questions? Reply to this email or contact us at support@chefscart.ai
    `

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ChefsCart <noreply@chefscart.ai>',
      to: [email],
      subject: `Welcome to the ChefsCart waitlist!`,
      html: htmlContent,
      text: textContent,
    })

    if (error) {
      throw new Error(error.message || 'Failed to send email')
    }
  } catch (error) {
    console.error('Error sending waitlist confirmation email:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: WaitlistRequest = await request.json()
    const { email, zipCode, firstName, lastName } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json({
        error: 'Email is required'
      }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({
        error: 'Invalid email format'
      }, { status: 400 })
    }

    if (!zipCode) {
      return NextResponse.json({
        error: 'ZIP code is required'
      }, { status: 400 })
    }

    if (!isValidZipCode(zipCode)) {
      return NextResponse.json({
        error: 'Invalid ZIP code format'
      }, { status: 400 })
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Validate ZIP code format
    const isValidZipFormat = await validateZipCodeFormat(zipCode)
    if (!isValidZipFormat) {
      return NextResponse.json({
        error: 'Invalid ZIP code format'
      }, { status: 400 })
    }

    // Check if already on waitlist
    const existsOnWaitlist = await checkExistingWaitlistEntry(normalizedEmail, zipCode)
    if (existsOnWaitlist) {
      return NextResponse.json({
        success: true,
        message: 'You are already on the waitlist for this area'
      })
    }

    // Create waitlist entry
    const waitlistEntry: WaitlistEntry = {
      email: normalizedEmail,
      zipCode,
      ...(firstName?.trim() && { firstName: firstName.trim() }),
      ...(lastName?.trim() && { lastName: lastName.trim() }),
      createdAt: new Date(),
      source: 'manual',
    }

    // Add to database
    const entryId = await addToWaitlist(waitlistEntry)

    // Send confirmation email (don't fail the request if email fails)
    try {
      await sendWaitlistConfirmationEmail(
        normalizedEmail,
        firstName,
        zipCode
      )
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      return NextResponse.json({
        success: true,
        message: 'Added to waitlist but confirmation email failed to send',
        entryId
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully added to waitlist',
      entryId
    })

  } catch (error) {
    console.error('Waitlist signup error:', error)
    return NextResponse.json({
      error: 'Failed to add to waitlist',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}