import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planId, userId } = body

    if (!planId || !userId) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 })
    }

    console.log('Creating mock Instacart cart...')

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Generate mock cart data
    const cartId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const cartUrl = `https://www.instacart.com/store/checkout?cart_id=${cartId}&partner=chefscart`

    // Mock 92% success rate
    const totalItems = Math.floor(Math.random() * 15) + 10 // 10-25 items
    const matchedItems = Math.floor(totalItems * 0.92)
    const outOfStockItems = ['Premium olive oil', 'Organic quinoa'] // Mock out of stock

    console.log(`Mock cart created: ${matchedItems}/${totalItems} items matched`)

    // Send confirmation email
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'support@chefscart.ai',
          subject: '🛒 Your ChefsCart shopping list is ready!',
          html: createConfirmationEmail({ cartUrl, totalItems, matchedItems, outOfStockItems }),
          text: `Your ChefsCart shopping list is ready! Cart: ${cartUrl}`
        })
      })
      
      if (emailResponse.ok) {
        console.log('Confirmation email sent')
      }
    } catch (emailError) {
      console.warn('Failed to send confirmation email:', emailError)
    }

    return NextResponse.json({
      success: true,
      listId: `list_${Date.now()}`,
      cartUrl,
      ingredientMatchPct: Math.round((matchedItems / totalItems) * 100),
      totalItems,
      matchedItems,
      outOfStockItems
    })

  } catch (error) {
    console.error('Error creating mock cart:', error)
    return NextResponse.json({
      error: 'Failed to create cart',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function createConfirmationEmail(data: {
  cartUrl: string
  totalItems: number
  matchedItems: number
  outOfStockItems: string[]
}): string {
  const { cartUrl, totalItems, matchedItems, outOfStockItems } = data

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your ChefsCart Shopping List</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ea580c; margin-bottom: 10px;">🧑‍🍳 ChefsCart</h1>
        <h2 style="color: #666; font-weight: normal;">Your shopping list is ready!</h2>
      </div>

      <div style="background: #f97316; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0;">🛒 Review & Edit Your Cart</h3>
        <a href="${cartUrl}" 
           style="background: white; color: #f97316; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Open in Instacart →
        </a>
      </div>

      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #374151;">📊 Shopping Summary</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 5px 0;">✅ <strong>${matchedItems} of ${totalItems}</strong> ingredients found</li>
          ${outOfStockItems.length > 0 ? 
            `<li style="padding: 5px 0;">⚠️ <strong>${outOfStockItems.length}</strong> items may need substitutes</li>` 
            : ''
          }
        </ul>
      </div>

      <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h4 style="margin-top: 0; color: #92400e;">🆘 Need Help?</h4>
        <p style="margin-bottom: 10px; font-size: 14px;">
          <strong>Want a fresh cart?</strong><br>
          Reply to this email or visit ChefsCart to adjust preferences.
        </p>
      </div>

      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          Happy cooking! 👨‍🍳<br>
          <strong>The ChefsCart Team</strong>
        </p>
      </div>

    </body>
    </html>
  `
}