import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not configured')
  }
  return new Resend(apiKey)
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text } = await request.json()

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 })
    }


    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'support@chefscart.ai',
      to: [to],
      subject,
      html: html || undefined,
      text: text || undefined,
    })

    if (error) {
      console.error('Resend error:', error)
      throw new Error(error.message || 'Failed to send email')
    }


    return NextResponse.json({
      success: true,
      messageId: data?.id
    })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}