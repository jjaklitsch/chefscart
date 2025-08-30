import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { groceryItems = [], zipCode } = body

    if (!groceryItems || groceryItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No grocery items provided'
      }, { status: 400 })
    }

    // Mock processing delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Generate mock Instacart URL
    const mockCartId = Math.random().toString(36).substring(2, 15)
    const mockCartUrl = `https://instacart.com/store/checkout_v3?cart_id=${mockCartId}`

    // Mock response with processed items
    const processedItems = groceryItems.map((item: any, index: number) => ({
      id: `mock_item_${index}`,
      name: item.name || item,
      quantity: item.quantity || 1,
      unit: item.unit || 'item',
      estimatedCost: Math.round((Math.random() * 8 + 2) * 100) / 100, // $2-$10
      found: Math.random() > 0.1, // 90% found rate
      alternatives: Math.random() > 0.7 ? [
        `Alternative ${item.name || item} brand`,
        `Organic ${item.name || item}`
      ] : []
    }))

    const totalItems = processedItems.length
    const foundItems = processedItems.filter((item: any) => item.found).length
    const estimatedTotal = processedItems
      .filter((item: any) => item.found)
      .reduce((sum: number, item: any) => sum + (item.estimatedCost * item.quantity), 0)

    return NextResponse.json({
      success: true,
      cartUrl: mockCartUrl,
      cartId: mockCartId,
      items: processedItems,
      summary: {
        totalItems,
        foundItems,
        notFoundItems: totalItems - foundItems,
        estimatedTotal: Math.round(estimatedTotal * 100) / 100,
        estimatedTax: Math.round(estimatedTotal * 0.08 * 100) / 100, // 8% tax
        estimatedGrandTotal: Math.round(estimatedTotal * 1.08 * 100) / 100
      },
      message: `Successfully created mock cart with ${foundItems}/${totalItems} items found`
    })

  } catch (error) {
    console.error('Mock cart creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create mock cart',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}