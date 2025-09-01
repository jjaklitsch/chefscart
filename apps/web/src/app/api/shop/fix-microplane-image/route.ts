import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return a good Microplane image URL for the fallback
  return NextResponse.json({
    success: true,
    data: {
      microplaneImage: "https://m.media-amazon.com/images/I/313UAorevsL._SL500_.jpg",
      productTitle: "Microplane Premium Classic Series Zester"
    }
  });
}