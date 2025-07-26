/**
 * Analytics API endpoint for tracking events
 * In production, forward to PostHog, Mixpanel, or your analytics provider
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    
    // Validate required fields
    if (!event.event || !event.properties) {
      return NextResponse.json(
        { error: 'Missing required fields: event, properties' },
        { status: 400 }
      );
    }

    // Add server-side enrichment
    const enrichedEvent = {
      ...event,
      server_timestamp: Date.now(),
      ip_address: request.ip || request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    };

    // Log to console for development
    console.log('[Analytics Event]:', JSON.stringify(enrichedEvent, null, 2));

    // In production, send to your analytics provider:
    // - PostHog: await posthog.capture(event)
    // - Mixpanel: await mixpanel.track(event)
    // - Custom: await sendToCustomAnalytics(enrichedEvent)

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics event' },
      { status: 500 }
    );
  }
}